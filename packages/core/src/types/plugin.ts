import type { RsdoctorPrimarySDK, RsdoctorSDK } from '@rsdoctor/sdk';
import type {
  Common,
  Linter,
  Linter as LinterType,
  Plugin,
  SDK,
} from '@rsdoctor/types';
import { rules } from '@/rules/rules';

type InternalRules = Common.UnionToTuple<(typeof rules)[number]>;

export type IReportCodeType = {
  noModuleSource?: boolean;
  noAssetsAndModuleSource?: boolean;
  noCode?: boolean;
};

// Conditional output type based on mode
export type IOutput<T extends 'brief' | 'normal' | undefined = undefined> =
  T extends 'brief'
    ? BriefModeConfig
    : T extends 'normal'
      ? NormalModeConfig
      : BriefModeConfig | NormalModeConfig | OutputBaseConfig;
export type NewReportCodeType =
  | 'noModuleSource'
  | 'noAssetsAndModuleSource'
  | 'noCode';
export interface NormalModeOptions {
  // Normal mode doesn't have type field, it's only available in brief mode
  type?: never;
}

export interface BriefModeOptions {
  /** Output type, supports HTML and JSON */
  type?: Array<'html'>;
  /** HTML output related configuration */
  // jsonOptions?: {};
  htmlOptions?: SDK.BriefConfig;
}

interface OutputBaseConfig {
  /**
   * The directory where the report files will be output.
   */
  reportDir?: string;

  /**
   * Control the Rsdoctor reporter codes records.
   */
  reportCodeType?: IReportCodeType | undefined | NewReportCodeType;

  /**
   * @deprecated
   * Configure whether to compress data.
   * @default false
   *
   */
  compressData?: boolean;
}

// Conditional type for reportCodeType based on mode
type ReportCodeTypeByMode<T extends 'brief' | 'normal'> = T extends 'brief'
  ? undefined | 'noCode' | { noCode?: boolean }
  : T extends 'normal'
    ? IReportCodeType | undefined | NewReportCodeType
    : IReportCodeType | undefined | NewReportCodeType;

// Brief Mode Type
export interface BriefModeConfig
  extends Omit<OutputBaseConfig, 'reportCodeType' | 'mode'> {
  mode?: 'brief';
  reportCodeType?: ReportCodeTypeByMode<'brief'>;
  options?: BriefModeOptions;
}

// Normal Mode Type
interface NormalModeConfig
  extends Omit<OutputBaseConfig, 'reportCodeType' | 'mode'> {
  mode?: 'normal';
  reportCodeType?: ReportCodeTypeByMode<'normal'>;
  options?: NormalModeOptions;
}

export interface RsdoctorWebpackPluginOptions<
  Rules extends LinterType.ExtendRuleData[],
> {
  /** Checker configuration */
  linter?: LinterType.Options<Rules, InternalRules>;
  /**
   * the switch for the Rsdoctor features.
   */
  features?:
    | Plugin.RsdoctorWebpackPluginFeatures
    | Array<keyof Plugin.RsdoctorWebpackPluginFeatures>;

  /**
   * @deprecated  Use `output.mode` instead, if you're using `lite` mode, please use `output.reportCodeType: 'noCode' or 'noAssetsAndModuleSource'` instead.
   * Rsdoctor mode option:
   * - normal: Refers to the normal mode.
   * - brief: Refers to the brief mode, which only displays the results of the duration analysis and build artifact analysis
   *    and does not display any part of the code.
   */
  mode?: 'brief' | 'normal' | 'lite';

  /**
   * configuration of the interceptor for webpack loaders. TODO: delete this options.
   * @description worked when the `features.loader === true`.
   */
  loaderInterceptorOptions?: {
    /**
     * loaders which you want to skip it (will not report the target loader data when webpack compile).
     */
    skipLoaders?: string[];
  };
  /**
   * turn on it if you don't need to see profile in browser.
   * @default false
   */
  disableClientServer?: boolean;

  /**
   * sdk instance of outside.
   */
  sdkInstance?: RsdoctorSDK;

  /**
   * Whether to turn on some characteristic analysis capabilities, such as: the support for the BannerPlugin.
   */
  supports?: ISupport;

  /**
   * The port of the Rsdoctor server.
   */
  port?: number;

  /**
   * Options to control the log printing.
   */
  printLog?: SDK.IPrintLog;

  /**
   * @deprecated  Use `output.options.htmlOptions` instead.
   * Please use the output.options to set the brief options, BriefModeOptions.
   * Options to control brief mode reports.
   */
  brief?: SDK.BriefConfig;

  /**
   * The name of inner rsdoctor's client package, used by inner-rsdoctor.
   * @default false
   */
  innerClientPath?: string;

  output?: IOutput<'brief' | 'normal'>;
}

export interface RsdoctorMultiplePluginOptions<
  Rules extends LinterType.ExtendRuleData[] = LinterType.ExtendRuleData[],
> extends Omit<RsdoctorWebpackPluginOptions<Rules>, 'sdkInstance'>,
    Pick<ConstructorParameters<typeof RsdoctorPrimarySDK>[0], 'stage'> {
  /**
   * name of builder
   */
  name?: string;
}

interface ISupport {
  banner?: boolean;
  parseBundle?: boolean;
  generateTileGraph?: boolean;
  gzip?: boolean;
}

export interface RsdoctorPluginOptionsNormalized<
  Rules extends LinterType.ExtendRuleData[] = [],
> extends Common.DeepRequired<
    Omit<
      RsdoctorWebpackPluginOptions<Rules>,
      | 'sdkInstance'
      | 'linter'
      | 'output'
      | 'supports'
      | 'port'
      | 'brief'
      | 'mode'
    >
  > {
  features: Common.DeepRequired<Plugin.RsdoctorWebpackPluginFeatures>;
  linter: Required<LinterType.Options<Rules, InternalRules>>;
  sdkInstance?: RsdoctorSDK;
  output: {
    mode: keyof typeof SDK.IMode;
    reportCodeType: SDK.ToDataType;
    reportDir: string;
    options: BriefModeOptions | NormalModeOptions;
  };
  port?: number;
  supports: ISupport;
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
  readonly options: RsdoctorPluginOptionsNormalized<Rules>;
  readonly sdk: RsdoctorSDK;
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
> extends RsdoctorWebpackPluginOptions<Rules> {
  /**
   * The experiments of the Rsdoctor Rspack plugin.
   */
  experiments?: RsdoctorRspackPluginExperiments;
}

export type RsdoctorRspackPluginOptionsNormalized<
  Rules extends Linter.ExtendRuleData[],
> = RsdoctorPluginOptionsNormalized<Rules> & {
  experiments?: RsdoctorRspackPluginExperimentsNormalized;
};
