import type { RuleSetRule } from '@rspack/core';

export type Rule = RuleSetRule & {
  /**
   * Legacy configuration accepted by Rsdoctor's loader interception.
   * Normalized to `use` because Rspack does not read this rule field.
   */
  loaders: RuleSetRule['use'];
};
