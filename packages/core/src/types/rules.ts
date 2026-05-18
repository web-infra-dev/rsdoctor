import { RuleSetRule } from '@rspack/core';

export type Rule = RuleSetRule & {
  /**
   * Loader list configured on a module rule.
   */
  loaders?: unknown[];
};
