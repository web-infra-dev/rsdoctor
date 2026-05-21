import { Common, Config, Linter as LinterType, SDK } from '..';
import { InternalRules } from './internal-rules';

export interface RsdoctorWebpackPluginFeatures {
  /**
   * turn off it if you need not to analyze the executions of webpack loaders.
   * @default true
   */
  loader?: boolean;
  /**
   * turn off it if you need not to analyze the executions of webpack plugins.
   * @default true
   */
  plugins?: boolean;
  /**
   * turn off it if you need not to analyze the executions of resolver.
   * @default false
   */
  resolver?: boolean;
  /**
   * turn off it if you need not to analyze the output bundle.
   * @default true
   */
  bundle?: boolean;
  /**
   * turn off it if you need not to analyze the result of tree shaking.
   * @default false
   */
  treeShaking?: boolean;
  /**
   * turn on it if you just use lite mode. This mode do not have source codes.
   * @default false
   */
  lite?: boolean;
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
  features: Common.DeepRequired<RsdoctorWebpackPluginFeatures>;
  linter: Required<LinterType.Options<Rules, InternalRules>>;
  sdkInstance?: SDK.RsdoctorBuilderSDKInstance;
  output: {
    mode: keyof typeof SDK.IMode;
    reportCodeType: SDK.ToDataType;
    reportDir: string;
    options: Config.BriefModeOptions | Config.NormalModeOptions;
  };
  port?: number;
  supports: ISupport;
}

interface ISupport {
  banner?: boolean;
  parseBundle?: boolean;
  generateTileGraph?: boolean;
  gzip?: boolean;
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

export type IReportCodeType = {
  noModuleSource?: boolean;
  noAssetsAndModuleSource?: boolean;
  noCode?: boolean;
};

export type NewReportCodeType =
  | 'noModuleSource'
  | 'noAssetsAndModuleSource'
  | 'noCode';

export interface RsdoctorWebpackPluginOptions<
  Rules extends LinterType.ExtendRuleData[],
> {
  /** Checker configuration */
  linter?: LinterType.Options<Rules, InternalRules>;
  /**
   * the switch for the Rsdoctor features.
   */
  features?:
    | RsdoctorWebpackPluginFeatures
    | Array<keyof RsdoctorWebpackPluginFeatures>;

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
  sdkInstance?: SDK.RsdoctorBuilderSDKInstance;

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
  brief?: Config.BriefConfig;

  /**
   * The name of inner rsdoctor's client package, used by inner-rsdoctor.
   * @default false
   */
  innerClientPath?: string;

  output?: Config.IOutput<'brief' | 'normal'>;
}

// Conditional type for reportCodeType based on mode
type ReportCodeTypeByMode<T extends 'brief' | 'normal'> = T extends 'brief'
  ? undefined | 'noCode' | { noCode?: boolean }
  : T extends 'normal'
    ? IReportCodeType | undefined | NewReportCodeType
    : IReportCodeType | undefined | NewReportCodeType;

export interface NormalModeOptions {
  // Normal mode doesn't have type field, it's only available in brief mode
  type?: never;
}

// Normal Mode Type
interface NormalModeConfig
  extends Omit<OutputBaseConfig, 'reportCodeType' | 'mode'> {
  mode?: 'normal';
  reportCodeType?: ReportCodeTypeByMode<'normal'>;
  options?: NormalModeOptions;
}

export interface BriefModeOptions {
  /** Output type, supports HTML and JSON */
  type?: Array<'html'>;
  /** HTML output related configuration */
  // jsonOptions?: {};
  htmlOptions?: Config.BriefConfig;
}

export interface BriefModeConfig
  extends Omit<OutputBaseConfig, 'reportCodeType' | 'mode'> {
  mode?: 'brief';
  reportCodeType?: ReportCodeTypeByMode<'brief'>;
  options?: BriefModeOptions;
}

export type IOutput<T extends 'brief' | 'normal' | undefined = undefined> =
  T extends 'brief'
    ? BriefModeConfig
    : T extends 'normal'
      ? NormalModeConfig
      : BriefModeConfig | NormalModeConfig | OutputBaseConfig;
