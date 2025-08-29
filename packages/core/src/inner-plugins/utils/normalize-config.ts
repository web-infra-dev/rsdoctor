import { Common, Config, Plugin, SDK } from '@rsdoctor/types';
import type {
  RuleSetCondition as RspackRuleSetCondition,
  RuleSetRule as RspackRuleSetRule,
} from '@rspack/core';
import {
  RuleSetCondition as WebpackRuleSetCondition,
  RuleSetConditionAbsolute as WebpackRuleSetConditionAbsolute,
  RuleSetRule as WebpackRuleSetRule,
} from 'webpack';

/**
 * Process mode-specific configurations with priority logic
 */
export function processModeConfigurations(
  finalMode: keyof typeof SDK.IMode,
  output: Config.IOutput<'brief' | 'normal'>,
  brief: Config.BriefConfig | undefined,
) {
  let finalBrief = {};
  let finalNormalOptions: Config.NormalModeOptions = {};

  if (finalMode === 'brief') {
    finalBrief = processBriefHtmlModeConfig(
      output as Config.BriefModeConfig,
      brief,
    );
  } else if (finalMode === 'normal') {
    finalNormalOptions = {};
  }

  return { finalBrief, finalNormalOptions };
}

/**
 * Process brief mode configuration with priority logic
 * Priority: output.options.briefOptions > output.brief > default
 */
export function processBriefHtmlModeConfig(
  output: Config.BriefModeConfig,
  brief: Config.BriefConfig | undefined,
): Config.BriefModeOptions {
  let htmlOptions: Config.BriefConfig = {
    reportHtmlName: undefined,
    writeDataJson: false,
  };
  let jsonOptions: Config.JsonOptions = {};
  const briefOptions = output?.options || {};

  if ('type' in briefOptions && briefOptions.type?.includes('json')) {
    jsonOptions = briefOptions.jsonOptions || {
      sections: {
        moduleGraph: true,
        chunkGraph: true,
        rules: true,
      },
    };
  }

  if (
    ('type' in briefOptions && briefOptions.type?.includes('html')) ||
    !briefOptions.type
  ) {
    const outputBriefOptions = briefOptions?.htmlOptions;
    const outputBrief = brief;
    htmlOptions = {
      reportHtmlName:
        outputBriefOptions?.reportHtmlName ||
        outputBrief?.reportHtmlName ||
        undefined,
      writeDataJson:
        outputBriefOptions?.writeDataJson ||
        outputBrief?.writeDataJson ||
        false,
    };
  }

  return {
    type: output.options?.type || ['html'],
    htmlOptions,
    jsonOptions,
  };
}

/**
 * Convert reportCodeType object to NewReportCodeType enum value
 */
export function convertReportCodeTypeObject(
  reportCodeType: any,
): Config.NewReportCodeType | undefined {
  if (!reportCodeType) return undefined;

  if (reportCodeType.noCode) {
    return 'noCode';
  } else if (reportCodeType.noAssetsAndModuleSource) {
    return 'noAssetsAndModuleSource';
  } else if (reportCodeType.noModuleSource) {
    return 'noModuleSource';
  }

  return undefined;
}

// --For loader configs--
/**
 * This function recursively processes rule set conditions to ensure they can be
 * properly serialized to JSON.
 *
 * @param item - The rule set condition to make serializable. Can be:
 *   - RspackRuleSetCondition: Rspack-specific rule conditions
 *   - WebpackRuleSetConditionAbsolute: Webpack absolute rule conditions
 *   - WebpackRuleSetCondition: Webpack rule conditions
 *   - void: Undefined or null values
 *
 * @example
 * ```typescript
 * const condition = /\.js$/;
 * JSON.stringify(condition); // Error: Converting circular structure to JSON
 *
 * makeRuleSetSerializable(condition);
 * JSON.stringify(condition); // '"/\\.js$/"'
 * ```
 */
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
