import { Config, Linter, Plugin, SDK } from '@rsdoctor/shared/types';
import { chalk, logger } from '@/logger';
import assert from 'assert';
import {
  convertReportCodeTypeObject,
  processModeConfigurations,
} from './normalize-config';

function defaultBoolean(v: unknown, dft: boolean): boolean {
  return typeof v === 'boolean' ? v : dft;
}
function getDefaultOutput() {
  return {
    mode: undefined,
    reportCodeType: {
      noModuleSource: false,
      noAssetsAndModuleSource: false,
      noCode: false,
    },
    options: undefined,
    reportDir: '',
    compressData: undefined,
  };
}
function getDefaultSupports() {
  return {
    parseBundle: true,
  };
}
function isJsonOutputEnv(value: unknown): boolean {
  return value === 'json';
}
function normalizeGzipLevel(value: unknown): number {
  const gzipLevel = value === undefined ? 6 : value;
  assert(
    typeof gzipLevel === 'number' &&
      Number.isInteger(gzipLevel) &&
      gzipLevel >= 0 &&
      gzipLevel <= 9,
    '`supports.gzip.gzipLevel` must be an integer between 0 and 9.',
  );
  return gzipLevel;
}
function normalizeGzip(value: unknown): Plugin.NormalizedGzipConfig {
  assert(
    value === undefined ||
      typeof value === 'boolean' ||
      (typeof value === 'object' && value !== null && !Array.isArray(value)),
    '`supports.gzip` must be a boolean or an object.',
  );
  if (value === false) {
    return false;
  }
  const gzipLevel =
    typeof value === 'object' && value !== null
      ? (value as { gzipLevel?: unknown }).gzipLevel
      : undefined;
  return {
    gzipLevel: normalizeGzipLevel(gzipLevel),
  };
}

export function isCompilerWatching(
  compiler: Pick<Plugin.BaseCompiler, 'watchMode' | 'parentCompilation'>,
): boolean {
  return Boolean(
    compiler.watchMode || compiler.parentCompilation?.compiler.watchMode,
  );
}

export function getEffectiveGzipConfig(
  compiler: Pick<Plugin.BaseCompiler, 'watchMode' | 'parentCompilation'>,
  gzip: Plugin.NormalizedGzipConfig,
): Plugin.NormalizedGzipConfig {
  return isCompilerWatching(compiler) ? false : gzip;
}

function normalizeFeatures(features: any, mode: keyof typeof SDK.IMode) {
  if (Array.isArray(features)) {
    return {
      loader: features.includes('loader'),
      plugins: features.includes('plugins'),
      resolver: features.includes('resolver'),
      bundle: features.includes('bundle'),
      treeShaking: features.includes('treeShaking'),
      lite: features.includes('lite') || mode === SDK.IMode[SDK.IMode.lite],
    };
  }
  return {
    loader: defaultBoolean(features.loader, true),
    plugins: defaultBoolean(features.plugins, true),
    resolver: defaultBoolean(features.resolver, false),
    bundle: defaultBoolean(features.bundle, true),
    treeShaking: defaultBoolean(features.treeShaking, false),
    lite:
      defaultBoolean(features.lite, false) ||
      mode === SDK.IMode[SDK.IMode.lite],
  };
}
function normalizeLinter(linter: any) {
  return {
    rules: {} as any,
    extends: [] as any,
    level: 'Error',
    ...linter,
  };
}

function isValidMode(mode: any): mode is keyof typeof SDK.IMode {
  return typeof mode === 'string' && ['brief', 'normal', 'lite'].includes(mode);
}

export function normalizeUserConfig<Rules extends Linter.ExtendRuleData[]>(
  config: Plugin.RsdoctorRspackPluginOptions<Rules> = {},
): Plugin.RsdoctorPluginOptionsNormalized<Rules> {
  const deprecatedMode = (config as { mode?: unknown }).mode;
  const userOutput = config.output;
  const defaultOutput = getDefaultOutput();
  const outputConfig: Config.IOutput<'brief' | 'normal'> = isJsonOutputEnv(
    process.env.RSDOCTOR_OUTPUT,
  )
    ? {
        reportDir: userOutput?.reportDir,
        compressData: userOutput?.compressData,
        mode: 'brief' as const,
        options: {
          type: ['json'] as Array<'json'>,
        },
      }
    : (userOutput ?? defaultOutput);
  const normalizedConfig = {
    ...config,
    output: outputConfig,
  };
  const {
    linter = {},
    features = {},
    loaderInterceptorOptions = {},
    disableClientServer: userDisableClientServer = false,
    sdkInstance,
    innerClientPath = '',
    output = outputConfig,
    supports: userSupports = {},
    port,
    server: userServer = {},
    printLog = { serverUrls: true },
    brief = undefined,
    multiCompiler = true,
  } = normalizedConfig;
  const supports = {
    ...getDefaultSupports(),
    ...userSupports,
    gzip: normalizeGzip(userSupports.gzip),
  };
  // If process.env.RSTEST is set to true, disableClientServer should be false
  // Otherwise, if process.env.CI is set, disableClientServer should be true
  const disableClientServer =
    process.env.RSTEST === 'true'
      ? false
      : process.env.CI
        ? true
        : userDisableClientServer;
  assert(typeof linter === 'object');
  assert(typeof features === 'object' || Array.isArray(features));
  assert(typeof loaderInterceptorOptions === 'object');
  assert(typeof disableClientServer === 'boolean');
  assert(typeof port === 'undefined' || typeof port === 'number');
  assert(typeof userServer === 'object' && userServer !== null);
  const server: SDK.RsdoctorServerConfig = {
    ...userServer,
  };
  assert(typeof server.port === 'undefined' || typeof server.port === 'number');
  assert(
    typeof multiCompiler === 'boolean' ||
      (typeof multiCompiler === 'object' && multiCompiler !== null),
  );
  if (typeof server.port === 'undefined' && typeof port !== 'undefined') {
    server.port = port;
  }
  let finalMode: keyof typeof SDK.IMode =
    ('mode' in output && isValidMode(output.mode)
      ? output.mode === ('lite' as SDK.IMode.normal)
        ? SDK.IMode[SDK.IMode.normal]
        : output.mode
      : undefined) || SDK.IMode[SDK.IMode.normal];
  if (deprecatedMode !== undefined) {
    const replacement =
      deprecatedMode === 'lite' ? 'output.reportCodeType' : 'output.mode';
    logger.info(
      chalk.yellow(
        `The top-level 'mode' configuration was removed in Rsdoctor 2.x and is ignored. Please use '${replacement}' instead.`,
      ),
    );
  }
  const _features = normalizeFeatures(features, finalMode);
  const _linter = normalizeLinter(linter);
  // Process mode-specific configurations
  const { finalBrief, finalNormalOptions } = processModeConfigurations(
    finalMode,
    output,
    brief,
  );
  // If lite mode is enabled and mode is not brief: finalBrief, set mode to lite
  if (_features.lite && finalMode !== SDK.IMode[SDK.IMode.brief]) {
    finalMode = SDK.IMode[SDK.IMode.lite] as keyof typeof SDK.IMode;
  }
  const reportCodeType = output.reportCodeType
    ? normalizeReportType(output.reportCodeType, finalMode)
    : normalizeReportType(getDefaultOutput().reportCodeType, finalMode);
  const res: Plugin.RsdoctorPluginOptionsNormalized<Rules> = {
    linter: _linter,
    features: _features,
    loaderInterceptorOptions: {
      skipLoaders: Array.isArray(loaderInterceptorOptions.skipLoaders)
        ? loaderInterceptorOptions.skipLoaders
        : [],
    },
    disableClientServer,
    sdkInstance,
    output: {
      mode: finalMode,
      options: finalMode === 'brief' ? finalBrief : finalNormalOptions,
      reportCodeType,
      reportDir: output.reportDir || '',
    },
    innerClientPath,
    supports,
    port,
    server,
    printLog,
    multiCompiler: {
      enabled: multiCompiler !== false,
      group:
        typeof multiCompiler === 'object' ? multiCompiler.group : undefined,
    },
  };

  // Add deprecation warning for compressData
  if (output.compressData !== undefined) {
    logger.info(
      chalk.yellow(
        `The 'compressData' configuration is deprecated in Rsdoctor 2.x.`,
      ),
    );
  }

  return res;
}

export const normalizeReportType = (
  reportCodeType: Plugin.IReportCodeType | Plugin.NewReportCodeType,
  mode: keyof typeof SDK.IMode,
): SDK.ToDataType => {
  const convertedReportCodeType =
    typeof reportCodeType === 'object'
      ? convertReportCodeTypeObject(reportCodeType)
      : reportCodeType;
  if (convertedReportCodeType === 'noCode') {
    return SDK.ToDataType.NoCode;
  }
  if (mode === SDK.IMode[SDK.IMode.brief]) {
    return SDK.ToDataType.NoCode;
  }
  if (mode === SDK.IMode[SDK.IMode.lite]) {
    return SDK.ToDataType.NoSourceAndAssets;
  }
  if (convertedReportCodeType === 'noAssetsAndModuleSource') {
    return SDK.ToDataType.NoSourceAndAssets;
  }
  if (convertedReportCodeType === 'noModuleSource') {
    return SDK.ToDataType.NoSource;
  }
  return SDK.ToDataType.Normal;
};

export const normalizeRspackUserOptions = normalizeUserConfig;
