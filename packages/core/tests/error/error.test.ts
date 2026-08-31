import { describe, expect, it } from 'rstack/test';
import { DevToolError } from '@/error';

describe('DevToolError', () => {
  it('strips VT control characters from error descriptions', () => {
    const transformedError = DevToolError.from(
      new Error('\u001B[31mmessage\u001B[39m'),
    );
    const detailedError = new DevToolError('title', 'message', {
      detail: {
        description: '\u001B[33mdescription\u001B[39m',
      },
    });

    expect(transformedError.message).toBe('message');
    expect(detailedError.toData().description).toBe('description');
  });

  it('compares code frames deeply', () => {
    const createError = (column: number) =>
      new DevToolError('title', 'message', {
        codeFrame: {
          filePath: 'index.ts',
          fileContent: 'const answer = 42;',
          start: { line: 1, column },
        },
      });

    expect(createError(7).isSame(createError(7))).toBe(true);
    expect(createError(7).isSame(createError(8))).toBe(false);
  });

  it('disables all styling when noColor is enabled', () => {
    const error = new DevToolError('title', 'message', {
      code: 'E001',
      hint: 'check the config',
      referenceUrl: 'https://example.com',
      controller: {
        noColor: true,
      },
    });

    expect(error.toString()).toBe(
      [
        '[E001:Error:TITLE] message',
        '',
        ' HINT: check the config',
        ' See: https://example.com',
      ].join('\n'),
    );
  });
});
