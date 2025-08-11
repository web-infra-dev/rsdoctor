import { describe, it, expect } from '@rstest/core';
import { RuleSetRule } from 'webpack';
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

    expect(JSON.stringify(rules, null, 2)).toMatchSnapshot();
  });

  describe('normalizeRspackUserOptions enableNativePlugin', () => {
    it('should handle boolean true', () => {
      const options = {
        experiments: {
          enableNativePlugin: true,
        },
      };

      const result = normalizeRspackUserOptions(options);

      expect(result.experiments?.enableNativePlugin).toEqual({
        moduleGraph: true,
        chunkGraph: true,
      });
    });

    it('should handle boolean false', () => {
      const options = {
        experiments: {
          enableNativePlugin: false,
        },
      };

      const result = normalizeRspackUserOptions(options);

      expect(result.experiments?.enableNativePlugin).toEqual({
        moduleGraph: false,
        chunkGraph: false,
      });
    });

    it('should handle boolean undefined', () => {
      const options = {};

      const result = normalizeRspackUserOptions(options);

      expect(result.experiments?.enableNativePlugin).toEqual({
        moduleGraph: false,
        chunkGraph: false,
      });
    });
  });
});
