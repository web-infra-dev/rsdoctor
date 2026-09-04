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
    | 'server'
    | 'multiCompiler'
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
  server: SDK.RsdoctorServerConfig;
  supports: NormalizedSupports;
  multiCompiler: {
    enabled: boolean;
    group?: string;
  };
}

export type GzipConfig =
  | boolean
  | {
      /**
       * Gzip compression level used to calculate asset and module gzip sizes.
       * Must be an integer between 0 and 9.
       * @default 6
       */
      gzipLevel?: number;
    };

export type NormalizedGzipConfig =
  | false
  | {
      gzipLevel: number;
    };

interface ISupport {
  banner?: boolean;
  parseBundle?: boolean;
  generateTileGraph?: boolean;
  /**
   * Whether and how to calculate gzip sizes for assets and modules.
   * Set to `false` to disable gzip calculation, `true` to use the default
   * compression level, or an object to configure `gzipLevel`.
   * @default true
   */
  gzip?: GzipConfig;
}

type NormalizedSupports = Omit<ISupport, 'gzip'> & {
  gzip: NormalizedGzipConfig;
};

interface OutputBaseConfig {
  /**
   * The directory where the report files will be output.
   */
  reportDir?: string;

  /**
   * Control the Rsdoctor reporter codes records.
   */
  reportCodeType?: NewReportCodeType;
}

export type NewReportCodeType =
  'noModuleSource' | 'noAssetsAndModuleSource' | 'noCode';

export interface RsdoctorRspackPluginOptions<
  Rules extends LinterType.ExtendRuleData[],
> {
  /**
   * Configure automatic multi-compiler aggregation.
   *
   * Rsdoctor groups plugin instances created for the same compiler startup by
   * default. Set this to `false` when multiple unrelated compilers are created
   * together in the same process, or provide a group name to explicitly group
   * compiler reports.
   *
   * @default true
   */
  multiCompiler?: boolean | { group?: string };

  /** Checker configuration */
  linter?: LinterType.Options<Rules, InternalRules>;
  /**
   * the switch for the Rsdoctor features.
   */
  features?:
    RsdoctorRspackPluginFeatures | Array<keyof RsdoctorRspackPluginFeatures>;

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
   * Options for the Rsdoctor report server.
   */
  server?: SDK.RsdoctorServerConfig;

  /**
   * Options to control the log printing.
   */
  printLog?: SDK.IPrintLog;

  /**
   * The name of inner rsdoctor's client package, used by inner-rsdoctor.
   * @default false
   */
  innerClientPath?: string;

  output?: Config.IOutput<'brief' | 'normal'>;
}

// Conditional type for reportCodeType based on mode
type ReportCodeTypeByMode<T extends 'brief' | 'normal'> = T extends 'brief'
  ? 'noCode' | undefined
  : NewReportCodeType | undefined;

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
