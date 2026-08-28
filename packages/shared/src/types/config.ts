export interface BriefConfig {
  reportHtmlName?: string;
}

export interface NormalModeOptions {
  // Normal mode doesn't have type field, it's only available in brief mode
  type?: never;
}

interface JsonSectionOptions {
  /**
   * @default: true
   * */
  moduleGraph?: boolean;
  /**
   * @default: true
   * */
  chunkGraph?: boolean;
  /**
   * @default: true
   * */
  rules?: boolean;
}

export interface JsonOptions {
  fileName?: string;
  sections?: JsonSectionOptions;
}

export interface BriefModeOptions {
  /** Output type, supports HTML and JSON */
  type?: Array<'html' | 'json'>;
  /** HTML output related configuration */
  htmlOptions?: BriefConfig;
  /** JSON output related configuration */
  jsonOptions?: JsonOptions;
}

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

// Brief Mode Type
export interface BriefModeConfig extends Omit<
  OutputBaseConfig,
  'reportCodeType' | 'mode'
> {
  mode?: 'brief';
  reportCodeType?: ReportCodeTypeByMode<'brief'>;
  options?: BriefModeOptions;
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

// Conditional type for reportCodeType based on mode
type ReportCodeTypeByMode<T extends 'brief' | 'normal'> = T extends 'brief'
  ? 'noCode' | undefined
  : NewReportCodeType | undefined;

// Conditional output type based on mode
export type IOutput<T extends 'brief' | 'normal'> = T extends 'brief'
  ? BriefModeConfig
  : T extends 'normal'
    ? NormalModeConfig
    : BriefModeConfig | NormalModeConfig | OutputBaseConfig;

export type NewReportCodeType =
  'noModuleSource' | 'noAssetsAndModuleSource' | 'noCode';
