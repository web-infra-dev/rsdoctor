import { describe, expect, it } from 'rstack/test';
import { DevToolError } from '@/error';
import { summarizeRuleWarnings } from '../../src/inner-plugins/utils/ruleWarnings';

function createWarning(
  code: string,
  output?: { path: string; line?: number; column?: number },
  source?: { path: string; line?: number; column?: number },
) {
  return new DevToolError(
    'ECMA-VERSION-CHECK',
    'Found syntax that does not match "ecmaVersion <= 3"',
    {
      code,
      detail: {
        error: { output, source },
      },
      level: 'Warn',
    },
  );
}

describe('summarizeRuleWarnings', () => {
  it('summarizes E1004 warnings without changing other rule warnings', () => {
    const first = createWarning('E1004', {
      path: 'dist/main.js',
      line: 2,
      column: 4,
    });
    const otherRule = createWarning('E1001');
    const second = createWarning('E1004', {
      path: 'dist/async.js',
      line: 1,
      column: 2,
    });

    const result = summarizeRuleWarnings([first, otherRule, second]);

    expect(result).toHaveLength(2);
    expect(result[0].code).toBe('E1004');
    expect(result[0].message).toBe(
      [
        'Found 2 incompatible syntax issues for "ecmaVersion <= 3".',
        'Affected outputs: dist/main.js:2:4, dist/async.js:1:2',
        'View the Rsdoctor report for source-level details.',
      ].join('\n'),
    );
    expect(result[0].toString()).toBe(
      [
        '[E1004:Warn:ECMA-VERSION-CHECK] Found 2 incompatible syntax issues for "ecmaVersion <= 3".',
        'Affected outputs: dist/main.js:2:4, dist/async.js:1:2',
        'View the Rsdoctor report for source-level details.',
      ].join('\n'),
    );
    expect(result[1]).toBe(otherRule);
  });

  it('shows at most three locations and falls back to source paths', () => {
    const warnings = Array.from({ length: 5 }, (_, index) =>
      createWarning('E1004', undefined, {
        path: `src/module-${index}.js`,
        line: index + 1,
      }),
    );

    const [summary] = summarizeRuleWarnings(warnings);

    expect(summary.message).toContain(
      'Affected outputs: src/module-0.js:1, src/module-1.js:2, src/module-2.js:3, ... (+2 more issues)',
    );
    expect(summary.message).not.toContain('src/module-3.js');
  });

  it('returns the original array when there are no E1004 warnings', () => {
    const warnings = [createWarning('E1001')];

    expect(summarizeRuleWarnings(warnings)).toBe(warnings);
  });
});
