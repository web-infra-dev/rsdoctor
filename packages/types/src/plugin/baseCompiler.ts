import type {
  Compiler,
  Compilation,
  Stats,
  StatsError,
  RuleSetRule,
} from 'webpack';
import type {
  Compiler as RspackCompiler,
  Compilation as RspackCompilation,
  Stats as RspackStats,
  RuleSetRule as RspackRuleSetRule,
  RuleSetRules as RspackRuleSetRules,
} from '@rspack/core';

type RspackCompilerWrapper = any extends RspackCompiler
  ? never
  : RspackCompiler;

type RspackCompilationWrapper = any extends RspackCompilation
  ? never
  : RspackCompilation;

type RspackStatsWrapper = any extends RspackStats ? never : RspackStats;

type RspackRuleSetRuleWrapper = any extends RspackRuleSetRule
  ? never
  : RspackRuleSetRule;

type RspackRuleSetRulesWrapper = any extends RspackRuleSetRules
  ? never
  : (RspackRuleSetRule | '...')[] | RspackRuleSetRules;

export type BaseCompiler = (Compiler | RspackCompilerWrapper) & {
  webpack: any;
};

export type BaseCompilation = RspackCompilationWrapper | Compilation;

export type BaseStats = Stats | RspackStatsWrapper;

export interface JsStatsError {
  message: string;
  formatted: string;
  title: string;
}

export interface JsStatsWarning {
  message: string;
  formatted: string;
}
export type BuildError = JsStatsError | StatsError;
export type BuildWarning = JsStatsWarning | StatsError;

export type BuildRuleSetRules =
  | (RuleSetRule | '...')[]
  | RspackRuleSetRulesWrapper;
export type BuildRuleSetRule = RuleSetRule | RspackRuleSetRuleWrapper;
