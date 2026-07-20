import { describe, it, expect } from '@rstest/core';
import type { RuleSetRule } from '@rspack/core';
import {
  makeRulesSerializable,
  normalizeRspackUserOptions,
} from '@/inner-plugins/utils';

describe('test src/utils/config.ts', () => {
  it('makeRulesSerializable()', async () => {
    const rules: RuleSetRule[] = [
      {
        test: /rule1/,
      },
      {
        test: /rule2/,
        oneOf: [
          {
            test: /oneof1/,
          },
          {
            test: 'aaa',
          },
        ],
        exclude: {
          and: [/exclude_and1/, /exclude_and2/],
          or: [/exclude_or/],
          not: /exclude_not/,
        },
      },
    ];

    makeRulesSerializable(rules);

    expect(JSON.parse(JSON.stringify(rules))).toMatchSnapshot();
  });

  it('normalizeRspackUserOptions()', () => {
    const result = normalizeRspackUserOptions({});

    expect(result.features.bundle).toBe(true);
    expect(result.supports.parseBundle).toBe(true);
  });
});
