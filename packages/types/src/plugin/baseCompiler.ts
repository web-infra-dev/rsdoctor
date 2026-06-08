import type {
  Compiler as RspackCompiler,
  Compilation as RspackCompilation,
  Stats as RspackStats,
  StatsError as RspackStatsError,
  RuleSetRule as RspackRuleSetRule,
  MultiCompiler,
} from '@rspack/core';

type RspackCompilerWrapper = RspackCompiler &
  Pick<
    MultiCompiler,
    keyof Omit<MultiCompiler, 'hooks' | 'options' | 'isChild'>
  >;

// type RspackCompilationWrapper = any extends RspackCompilation
//   ? never
//   : RspackCompilation;

type RspackStatsWrapper = any extends RspackStats ? never : RspackStats;

type RspackRuleSetRuleWrapper = any extends RspackRuleSetRule
  ? never
  : RspackRuleSetRule;

export type BaseCompilerType<T extends 'rspack' = 'rspack'> = T extends 'rspack'
  ? RspackCompilerWrapper
  : never;
export type BaseCompiler = BaseCompilerType;

export type BaseCompilationType<T extends 'rspack' = 'rspack'> =
  T extends 'rspack' ? RspackCompilation : never;
export type BaseCompilation = BaseCompilationType;

export type BaseStats = RspackStatsWrapper;

export interface JsStatsError {
  message: string;
  formatted?: string;
  title?: string;
}

export interface JsStatsWarning extends JsRspackError {
  message: string;
  formatted?: string;
}

export interface JsRspackError {
  name?: string;
  message: string;
  moduleIdentifier?: string;
  loc?: string;
  file?: string;
  stack?: string;
  hideStack?: boolean;
}

export type BuildError = JsStatsError | RspackStatsError;
export type BuildWarning = JsStatsWarning | RspackStatsError;

export type BuildRuleSetRules = (
  | false
  | ''
  | 0
  | RspackRuleSetRuleWrapper
  | '...'
  | null
  | undefined
)[];
export type BuildRuleSetRule = RspackRuleSetRuleWrapper;
