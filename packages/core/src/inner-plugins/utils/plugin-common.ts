import type { Configuration, RuleSetRule } from '@rspack/core';
import { openBrowser } from '@rsdoctor/sdk';
import { makeRulesSerializable } from '@rsdoctor/core/plugins';
import { SDK } from '@rsdoctor/types';
import { chalk } from '@rsdoctor/utils/logger';
import { cloneDeep } from 'es-toolkit/compat';
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

export async function handleBriefModeReport(
  sdk: any,
  options: any,
  disableClientServer: boolean,
): Promise<void> {
  if (
    !disableClientServer &&
    options.output.mode === SDK.IMode[SDK.IMode.brief]
  ) {
    const outputTypes = options.output.options?.type || [];
    const isJsonOnly =
      Array.isArray(outputTypes) &&
      outputTypes.length === 1 &&
      outputTypes[0] === 'json';

    if (isJsonOnly) {
      // Only JSON output: print JSON file location, no browser opening
      const jsonFileName =
        options.output.options?.jsonOptions?.fileName || 'rsdoctor-data.json';
      const jsonFilePath = path.resolve(sdk.outputDir, jsonFileName);

      console.log(
        `${chalk.green('[RSDOCTOR] generated JSON data')}: ${jsonFilePath}`,
      );
    } else {
      // HTML output (with or without JSON): print HTML path and open browser
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
}
