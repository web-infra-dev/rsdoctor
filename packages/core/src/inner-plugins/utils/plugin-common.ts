import type { Configuration, RuleSetRule } from '@rspack/core';
import { findRoot, openBrowser } from '@rsdoctor/sdk';
import { makeRulesSerializable } from '@rsdoctor/core/plugins';
import { SDK } from '@rsdoctor/types';
import { chalk } from '@rsdoctor/utils/logger';
import { cloneDeep } from 'lodash-es';
import path from 'path';

/**
 * Process compiler configuration to make it serializable
 */
export function processCompilerConfig(config: any): Configuration {
  const { plugins, infrastructureLogging, ...rest } = config;
  const _rest = cloneDeep(rest);

  // Make rules serializable
  if (_rest.module?.defaultRules) {
    makeRulesSerializable(_rest.module.defaultRules as RuleSetRule[]);
  }
  if (_rest.module?.rules) {
    makeRulesSerializable(_rest.module.rules as RuleSetRule[]);
  }

  return {
    ..._rest,
    plugins: plugins.map((e: any) => e?.constructor.name),
  } as unknown as Configuration;
}

/**
 * Report configuration to SDK
 */
export function reportConfiguration(
  sdk: any,
  name: string,
  version: string,
  configuration: Configuration,
): void {
  sdk.reportConfiguration({
    name,
    version,
    config: configuration,
    root: findRoot() || '',
  });
}

export function handleBriefModeReport(
  sdk: any,
  options: any,
  disableClientServer: boolean,
): void {
  if (
    !disableClientServer &&
    options.output.mode === SDK.IMode[SDK.IMode.brief]
  ) {
    const htmlOptions =
      ('htmlOptions' in options.output.options &&
        options.output.options.htmlOptions) ||
      undefined;
    const outputFilePath = path.resolve(
      sdk.outputDir,
      htmlOptions?.reportHtmlName || 'rsdoctor-report.html',
    );

    console.log(
      `${chalk.green('[RSDOCTOR] generated brief report')}: ${outputFilePath}`,
    );

    openBrowser(`file:///${outputFilePath}`);
  }
}
