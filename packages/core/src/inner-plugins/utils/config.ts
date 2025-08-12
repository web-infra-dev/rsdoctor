import { Common, Linter, Plugin, SDK } from '@rsdoctor/types';
import assert from 'assert';
import type {
  RuleSetCondition as RspackRuleSetCondition,
  RuleSetRule as RspackRuleSetRule,
} from '@rspack/core';
import {
  RuleSetCondition as WebpackRuleSetCondition,
  RuleSetConditionAbsolute as WebpackRuleSetConditionAbsolute,
  RuleSetRule as WebpackRuleSetRule,
} from 'webpack';
import {
  RsdoctorWebpackPluginOptions,
  RsdoctorPluginOptionsNormalized,
  IReportCodeType,
  RsdoctorRspackPluginOptions,
  RsdoctorRspackPluginOptionsNormalized,
} from '@/types';
import { chalk, logger } from '@rsdoctor/utils/logger';

function defaultBoolean(v: unknown, dft: boolean): boolean {
  return typeof v === 'boolean' ? v : dft;
}

function getDefaultOutput() {
  return {
    reportCodeType: {
      noModuleSource: false,
      noAssetsAndModuleSource: false,
      noCode: false,
    },
    reportDir: '',
    compressData: true,
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
    mode = 'normal',
    brief = {
      reportHtmlDir: undefined,
      reportHtmlName: undefined,
      writeDataJson: false,
    },
  } = config;

  assert(typeof linter === 'object');
  assert(typeof features === 'object' || Array.isArray(features));
  assert(typeof loaderInterceptorOptions === 'object');
  assert(typeof disableClientServer === 'boolean');

  const _features = normalizeFeatures(features, mode);
  const _linter = normalizeLinter(linter);

  // If lite mode is enabled and mode is not brief, set mode to lite
  let _mode: keyof typeof SDK.IMode = mode;

  if (_features.lite && _mode !== SDK.IMode[SDK.IMode.brief]) {
    _mode = SDK.IMode[SDK.IMode.lite] as keyof typeof SDK.IMode;
  }

  const reportCodeType = output.reportCodeType
    ? normalizeReportType(output.reportCodeType, _mode)
    : normalizeReportType(getDefaultOutput().reportCodeType, _mode);

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
      reportCodeType,
      reportDir: output.reportDir || '',
      compressData:
        output.compressData !== undefined ? output.compressData : true,
    },
    innerClientPath,
    supports,
    port,
    printLog,
    mode,
    brief,
  };

  if (
    res.output.compressData === false &&
    (!output.reportCodeType || !output.reportCodeType.noAssetsAndModuleSource)
  ) {
    logger.info(
      chalk.yellow(
        `[RSDOCTOR]: When you use compressData: false, it is recommended to set output.reportCodeType to { noAssetsAndModuleSource: true }.`,
      ),
    );
  }

  return res;
}

export function makeRuleSetSerializable(
  item:
    | RspackRuleSetCondition
    | WebpackRuleSetConditionAbsolute
    | WebpackRuleSetCondition
    | void,
) {
  if (!item) return;

  if (item instanceof RegExp) {
    // Used by the JSON.stringify method to enable the transformation of an object's data for JavaScript Object Notation (JSON) serialization.
    (item as Common.PlainObject).toJSON = item.toString;
  } else if (Array.isArray(item)) {
    item.forEach((i) => makeRuleSetSerializable(i));
  } else if (typeof item === 'object') {
    makeRuleSetSerializable(item.and);
    makeRuleSetSerializable(item.or);
    makeRuleSetSerializable(item.not);
  }
}

export function makeRulesSerializable(
  rules:
    | Plugin.RuleSetRule[]
    | RspackRuleSetRule['oneOf']
    | WebpackRuleSetRule['oneOf'],
) {
  if (!Array.isArray(rules)) return;

  if (!rules.length) return;

  rules.forEach((rule) => {
    if (!rule) return;

    makeRuleSetSerializable(rule.test);
    makeRuleSetSerializable(rule.resourceQuery);
    makeRuleSetSerializable(rule.resource);
    makeRuleSetSerializable(rule.resourceFragment);
    makeRuleSetSerializable(rule.scheme);
    makeRuleSetSerializable(rule.issuer);

    if ('issuerLayer' in rule) {
      makeRuleSetSerializable(rule.issuerLayer);
    }

    makeRuleSetSerializable(rule.include);
    makeRuleSetSerializable(rule.exclude);

    if (rule.oneOf) {
      makeRulesSerializable(rule.oneOf);
    }

    if ('rules' in rule && rule.rules) {
      makeRulesSerializable(rule.rules);
    }
  });
}

export const normalizeReportType = (
  reportCodeType: IReportCodeType,
  mode: keyof typeof SDK.IMode,
): SDK.ToDataType => {
  if (reportCodeType.noCode) {
    return SDK.ToDataType.NoCode;
  }

  if (mode === SDK.IMode[SDK.IMode.brief]) {
    return SDK.ToDataType.NoCode;
  }

  if (mode === SDK.IMode[SDK.IMode.lite]) {
    return SDK.ToDataType.NoSourceAndAssets;
  }

  if (reportCodeType.noAssetsAndModuleSource) {
    return SDK.ToDataType.NoSourceAndAssets;
  }

  if (reportCodeType.noModuleSource) {
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
