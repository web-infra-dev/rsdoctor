import type {
  Linter,
  Linter as LinterType,
  Plugin,
  SDK,
} from '@rsdoctor/shared/types';
export interface RsdoctorMultiplePluginOptions<
  Rules extends LinterType.ExtendRuleData[] = LinterType.ExtendRuleData[],
>
  extends
    Omit<Plugin.RsdoctorRspackPluginOptions<Rules>, 'sdkInstance'>,
    Pick<{ stage?: number }, 'stage'> {
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

export type RsdoctorRspackPluginInstance<
  Rules extends LinterType.ExtendRuleData[] = [],
> = RsdoctorPluginInstance<Plugin.BaseCompilerType<'rspack'>, Rules>;

export type RsdoctorRspackPluginOptions<
  Rules extends LinterType.ExtendRuleData[],
> = Plugin.RsdoctorRspackPluginOptions<Rules>;

export type RsdoctorRspackPluginOptionsNormalized<
  Rules extends Linter.ExtendRuleData[],
> = Plugin.RsdoctorPluginOptionsNormalized<Rules>;
