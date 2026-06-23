import { Common, Config, Linter as LinterType, SDK } from '..';
import { InternalRules } from './internal-rules';

export interface RsdoctorRspackPluginFeatures {
  /**
   * Turn it off if you do not need to analyze the executions of bundler loaders.
   * @default true
   */
  loader?: boolean;
  /**
   * Turn it off if you do not need to analyze the executions of bundler plugins.
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
   * Turn it on if you need to analyze tree-shaking side effects.
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
    RsdoctorRspackPluginOptions<Rules>,
    | 'sdkInstance'
    | 'linter'
    | 'output'
    | 'supports'
    | 'port'
    | 'brief'
    | 'mode'
    | 'server'
  >
> {
  features: Common.DeepRequired<RsdoctorRspackPluginFeatures>;
  linter: Required<LinterType.Options<Rules, InternalRules>>;
  sdkInstance?: SDK.RsdoctorBuilderSDKInstance;
  output: {
    mode: keyof typeof SDK.IMode;
    reportCodeType: SDK.ToDataType;
    reportDir: string;
    options: Config.BriefModeOptions | Config.NormalModeOptions;
  };
  port?: number;
  server: SDK.RsdoctorServerConfig;
  supports: ISupport;
}

interface ISupport {
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

export interface RsdoctorRspackPluginOptions<
  Rules extends LinterType.ExtendRuleData[],
> {
  /** Checker configuration */
  linter?: LinterType.Options<Rules, InternalRules>;
  /**
   * the switch for the Rsdoctor features.
   */
  features?:
    | RsdoctorRspackPluginFeatures
    | Array<keyof RsdoctorRspackPluginFeatures>;

  /**
   * @deprecated  Use `output.mode` instead, if you're using `lite` mode, please use `output.reportCodeType: 'noCode' or 'noAssetsAndModuleSource'` instead.
   * Rsdoctor mode option:
   * - normal: Refers to the normal mode.
   * - brief: Refers to the brief mode, which only displays the results of the duration analysis and build artifact analysis
   *    and does not display any part of the code.
   */
  mode?: 'brief' | 'normal' | 'lite';

  /**
   * Configuration for the bundler loader interceptor. TODO: delete this option.
   * @description worked when the `features.loader === true`.
   */
  loaderInterceptorOptions?: {
    /**
     * Loaders that should be skipped and not reported when the bundler compiles.
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

  /** Whether to turn on specific analysis capabilities. */
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
interface NormalModeConfig extends Omit<
  OutputBaseConfig,
  'reportCodeType' | 'mode'
> {
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

export interface BriefModeConfig extends Omit<
  OutputBaseConfig,
  'reportCodeType' | 'mode'
> {
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
