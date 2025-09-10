import type { RsdoctorPrimarySDK } from '@rsdoctor/sdk';
import type {
  Linter,
  Linter as LinterType,
  Plugin,
  SDK,
} from '@rsdoctor/types';
export interface RsdoctorMultiplePluginOptions<
  Rules extends LinterType.ExtendRuleData[] = LinterType.ExtendRuleData[],
> extends Omit<Plugin.RsdoctorWebpackPluginOptions<Rules>, 'sdkInstance'>,
    Pick<ConstructorParameters<typeof RsdoctorPrimarySDK>[0], 'stage'> {
  /**
   * name of builder
   */
  name?: string;
}

export interface BasePluginInstance<T extends Plugin.BaseCompiler> {
  apply: (compiler: T) => void;
  [k: string]: any;
}

export interface InternalPlugin<
  T extends Plugin.BaseCompiler,
  Rules extends LinterType.ExtendRuleData[] = [],
> extends BasePluginInstance<T> {
  readonly name: string;
  readonly scheduler: RsdoctorPluginInstance<T, Rules>;
}

export interface RsdoctorPluginInstance<
  T extends Plugin.BaseCompiler,
  Rules extends LinterType.ExtendRuleData[] = [],
> extends BasePluginInstance<T> {
  readonly name: string;
  readonly options: Plugin.RsdoctorPluginOptionsNormalized<Rules>;
  readonly sdk: SDK.RsdoctorBuilderSDKInstance;
  readonly isRsdoctorPlugin: boolean;
  _modulesGraphApplied?: boolean;
  chunkGraph?: SDK.ChunkGraphInstance;
  modulesGraph: SDK.ModuleGraphInstance;
  ensureModulesChunksGraphApplied(compiler: T): void;
}

export interface RsdoctorRspackPluginInstance<
  Rules extends LinterType.ExtendRuleData[] = [],
> extends RsdoctorPluginInstance<Plugin.BaseCompilerType<'rspack'>, Rules> {}

export interface NativePluginConfig {
  moduleGraph?: boolean;
  chunkGraph?: boolean;
}

export interface RsdoctorRspackPluginExperiments {
  /**
   * Whether to enable the native plugin to improve the performance.
   * @default false
   */
  enableNativePlugin?: boolean;
}

export interface RsdoctorRspackPluginExperimentsNormalized {
  enableNativePlugin?: NativePluginConfig;
}

export interface RsdoctorRspackPluginOptions<
  Rules extends LinterType.ExtendRuleData[],
> extends Plugin.RsdoctorWebpackPluginOptions<Rules> {
  /**
   * The experiments of the Rsdoctor Rspack plugin.
   */
  experiments?: RsdoctorRspackPluginExperiments;
}

export type RsdoctorRspackPluginOptionsNormalized<
  Rules extends Linter.ExtendRuleData[],
> = Plugin.RsdoctorPluginOptionsNormalized<Rules> & {
  experiments?: RsdoctorRspackPluginExperimentsNormalized;
};
