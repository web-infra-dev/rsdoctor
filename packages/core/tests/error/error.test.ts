import { describe, expect, it } from '@rstest/core';
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
});
