import type { RuleSetRule } from '@rspack/core';

export type Rule = RuleSetRule & {
  /**
   * The legacy `loaders` field used by rule normalizers.
   */
  loaders: RuleSetRule['use'];
};
