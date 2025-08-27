import type {
  Linter as LinterType,
  Common,
  Plugin,
  SDK,
  Linter,
} from '@rsdoctor/types';
import type { RsdoctorPrimarySDK, RsdoctorSDK } from '@rsdoctor/sdk';
import { rules } from '@/rules/rules';

type InternalRules = Common.UnionToTuple<(typeof rules)[number]>;

export type IReportCodeType = {
  noModuleSource?: boolean;
  noAssetsAndModuleSource?: boolean;
  noCode?: boolean;
};

export type IOutput = {};

enum ReportCodeType {
  NoModuleSource = 'noModuleSource',
  NoAssetsAndModuleSource = 'noAssetsAndModuleSource',
  NoCode = 'noCode',
}

interface NormalModeOptions {
  reportCodeType?: ReportCodeType;
}

// 输出模式枚举
enum RsdoctorOutputMode {
  Brief = 'brief',
  Normal = 'normal', // default
}

// 输出格式枚举
enum RsdoctorOutputType {
  HTML = 'html',
  JSON = 'json',
}

// JSON 输出预设
enum JsonPresetType {
  Minimal = 'minimal',
  Normal = 'normal', // default
}

// JSON 输出配置
interface JsonOptions {
  /** 输出预设类型 */
  preset?: JsonPresetType; // default: 'normal'
  /** 细粒度的数据输出控制 */
  sections?: JsonSectionOptions;
}

// JSON 输出的细粒度控制选项
interface JsonSectionOptions {
  /** 模块依赖图数据 */
  moduleGraph?: boolean; // default: true
  /** 代码块依赖图数据 */
  chunkGraph?: boolean; // default: true
  /** 规则相关数据 */
  rules?: boolean; // default: true
}

interface HtmlOptions {
  /** 自定义报告HTML文件名 */
  reportHtmlName?: string;
  /** 是否同时输出数据JSON文件 */
  writeDataJson?: boolean;
}

interface BriefModeOptions {
  /** 输出类型，支持HTML和JSON */
  type?: RsdoctorOutputType[]; // default: ['html']
  /** JSON输出相关配置 */
  jsonOptions?: JsonOptions;
  /** HTML输出相关配置 */
  htmlOptions?: HtmlOptions;
}

// 基础配置接口
interface BaseConfig {
  /** 输出目录路径 */
  outputDir: string;
}

// Brief 模式完整配置
interface BriefModeConfig extends BaseConfig {
  mode: RsdoctorOutputMode.Brief;
  options?: BriefModeOptions;
}

// Normal 模式完整配置
interface NormalModeConfig extends BaseConfig {
  mode: RsdoctorOutputMode.Normal;
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
   * @deprecated Now need to use output.mode.
   * Rsdoctor mode option:
   * - normal: Refers to the normal mode.
   * - brief: Refers to the brief mode, which only displays the results of the duration analysis and build artifact analysis
   *    and does not display any part of the code.
   */
  mode?: keyof typeof SDK.IMode;

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
   * Options to control brief mode reports.
   */
  brief?: SDK.BriefConfig;

  /**
   * The name of inner rsdoctor's client package, used by inner-rsdoctor.
   * @default false
   */
  innerClientPath?: string;

  output?:
    | ({
        /**
         * The directory where the report files will be output.
         */
        reportDir?: string;

        /**
         * Rsdoctor mode option:
         * - normal: Refers to the normal mode.
         * - brief: Refers to the brief mode, which only displays the results of the duration analysis and build artifact analysis
         *    and does not display any part of the code.
         */
        mode?: keyof typeof SDK.IMode;

        /**
         * Control the Rsdoctor reporter codes records.
         */
        reportCodeType?: IReportCodeType | undefined;

        /**
         * Configure whether to compress data.
         * @default false
         */
        compressData?: boolean;
      } & BriefModeConfig)
    | NormalModeConfig;
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
    compressData: boolean;
  };
  port?: number;
  supports: ISupport;
  brief: SDK.BriefConfig;
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
