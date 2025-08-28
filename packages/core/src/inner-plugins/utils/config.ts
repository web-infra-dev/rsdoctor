import { Linter, SDK } from '@rsdoctor/types';
import { chalk, logger } from '@rsdoctor/utils/logger';
import assert from 'assert';
import {
  IReportCodeType,
  NewReportCodeType,
  RsdoctorPluginOptionsNormalized,
  RsdoctorRspackPluginOptions,
  RsdoctorRspackPluginOptionsNormalized,
  RsdoctorWebpackPluginOptions,
} from '@/types';
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
    banner: undefined,
    gzip: true, // change the gzip to true by default.
  };
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
  config: RsdoctorWebpackPluginOptions<Rules> = {},
): RsdoctorPluginOptionsNormalized<Rules> {
  const {
    linter = {},
    features = {},
    loaderInterceptorOptions = {},
    disableClientServer = false,
    sdkInstance,
    innerClientPath = '',
    output = getDefaultOutput(),
    supports = getDefaultSupports(),
    port,
    printLog = { serverUrls: true },
    mode = undefined,
    brief = undefined,
  } = config;
  assert(typeof linter === 'object');
  assert(typeof features === 'object' || Array.isArray(features));
  assert(typeof loaderInterceptorOptions === 'object');
  assert(typeof disableClientServer === 'boolean');
  let finalMode: keyof typeof SDK.IMode =
    ('mode' in output && isValidMode(output.mode)
      ? output.mode === ('lite' as SDK.IMode.normal)
        ? SDK.IMode[SDK.IMode.normal]
        : output.mode
      : undefined) ||
    mode ||
    SDK.IMode[SDK.IMode.normal];

  if (mode) {
    logger.info(
      chalk.yellow(
        `The 'mode' configuration will be deprecated in a future version. Please use 'output.mode' instead.`,
      ),
    );
  }
  const _features = normalizeFeatures(features, finalMode);
  const _linter = normalizeLinter(linter);
  if (_features.lite || finalMode === SDK.IMode[SDK.IMode.lite]) {
    logger.info(
      chalk.yellow(
        `Lite features will be deprecated in a future version. Please use 'output: { reportCodeType: { noAssetsAndModuleSource: true }}' instead.`,
      ),
    );
  }
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
  const res: RsdoctorPluginOptionsNormalized<Rules> = {
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
    printLog,
  };

  // Add deprecation warning for compressData
  if (output.compressData !== undefined) {
    logger.info(
      chalk.yellow(
        `The 'compressData' configuration will be deprecated in a future version.`,
      ),
    );
  }

  return res;
}

export const normalizeReportType = (
  reportCodeType: IReportCodeType | NewReportCodeType,
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

export function normalizeRspackUserOptions<
  Rules extends Linter.ExtendRuleData[],
>(
  options: RsdoctorRspackPluginOptions<Rules>,
): RsdoctorRspackPluginOptionsNormalized<Rules> {
  const config: RsdoctorRspackPluginOptionsNormalized<Rules> =
    normalizeUserConfig(options);
  config.experiments ??= {
    enableNativePlugin: {
      moduleGraph: false,
      chunkGraph: false,
    },
  };
  if (
    typeof options.experiments?.enableNativePlugin === 'boolean' &&
    options.experiments?.enableNativePlugin === true
  ) {
    config.experiments.enableNativePlugin = {
      moduleGraph: true,
      chunkGraph: true,
    };
  } else {
    config.experiments.enableNativePlugin = {
      moduleGraph: false,
      chunkGraph: false,
    };
  }
  return config;
}
