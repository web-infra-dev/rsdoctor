import { describe, expect, it } from 'rstack/test';
import { formatCode } from '../../../../src/components/base/DiffViewer/format';

describe('formatCode', () => {
  it('formats TypeScript code', async () => {
    await expect(
      formatCode('const answer:number=42;const element=<div/>', 'typescript'),
    ).resolves.toBe('const answer: number = 42;\nconst element = <div />;\n');
  });

  it('returns the original code when formatting fails', async () => {
    const code = 'const =';

    await expect(formatCode(code, 'javascript')).resolves.toBe(code);
  });
});
