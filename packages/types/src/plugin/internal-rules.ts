import { Linter } from '../index';

export type InternalRules = Linter.RuleData[];

export type InternalRuleId =
  | 'E1001'
  | 'E1002'
  | 'E1003'
  | 'E1004'
  | 'E1005'
  | 'E1006';

export type InternalRuleName =
  | 'duplicate-package'
  | 'cross-chunks-package'
  | 'default-import-check'
  | 'ecma-version-check'
  | 'loader-performance-optimization'
  | 'module-mixed-chunks';
