import path from 'node:path';
import { describe, expect, it } from 'rstack/test';

import { rule } from '../../src/rules/rules/ecma-version-check';

async function checkSyntax(code: string, ecmaVersion: number) {
  const reports: unknown[] = [];
  const root = path.resolve('/project');

  await rule.check({
    chunkGraph: {
      getAssets: () => [{ path: 'bundle.js', content: code }],
    },
    configs: [{ config: { output: { path: path.join(root, 'dist') } } }],
    report: (data: unknown) => reports.push(data),
    root,
    ruleConfig: { ecmaVersion },
  } as any);

  return reports;
}

describe('ecma-version-check syntax grammars', () => {
  it('accepts native ES module output', async () => {
    expect(
      await checkSyntax('export const value = globalThis.input?.value;', 2024),
    ).toEqual([]);
  });

  it('accepts valid classic scripts', async () => {
    expect(
      await checkSyntax('function value(a, a) { return a; }', 2024),
    ).toEqual([]);
  });

  it.each([
    'const value = globalThis.input?.value;',
    'export const value = globalThis.input?.value;',
  ])('rejects syntax above the configured version in %s', async (code) => {
    expect(await checkSyntax(code, 2019)).toHaveLength(1);
  });
});
