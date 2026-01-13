import type { Configuration, RuleSetRule } from '@rspack/core';
import { openBrowser } from '@rsdoctor/sdk';
import { makeRulesSerializable } from '@rsdoctor/core/plugins';
import { SDK } from '@rsdoctor/types';
import { chalk } from '@rsdoctor/utils/logger';
import path from 'path';

/**
 * Safe cloneDeep implementation that skips read-only properties (getters without setters)
 * to avoid errors when cloning objects like AppContext that have read-only properties
 */
export function safeCloneDeep<T>(value: T, visited = new WeakMap()): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }
  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as T;
  }

  if (visited.has(value as object)) {
    return visited.get(value as object) as T;
  }

  if (Array.isArray(value)) {
    const len = value.length;
    const cloned: any[] = new Array(len);
    visited.set(value as object, cloned as T);
    for (let i = 0; i < len; i++) {
      cloned[i] = safeCloneDeep(value[i], visited);
    }
    return cloned as T;
  }

  const cloned: any = {};
  visited.set(value as object, cloned as T);

  const ownPropertyNames = Object.getOwnPropertyNames(value);
  const ownSymbols = Object.getOwnPropertySymbols(value);
  const enumerableKeys = Object.keys(value);
  const enumerableKeysSet = new Set(enumerableKeys);
  const obj = value as any;

  for (let i = 0; i < enumerableKeys.length; i++) {
    const key = enumerableKeys[i];

    const descriptor = Object.getOwnPropertyDescriptor(value, key);

    if (descriptor && descriptor.get && !descriptor.set) {
      continue;
    }

    try {
      const propValue = obj[key];
      cloned[key] = safeCloneDeep(propValue, visited);
    } catch {
      continue;
    }
  }

  for (let i = 0; i < ownPropertyNames.length; i++) {
    const key = ownPropertyNames[i];
    if (enumerableKeysSet.has(key)) {
      continue;
    }

    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor) continue;

    if (descriptor.get && !descriptor.set) {
      continue;
    }

    if (descriptor.set !== undefined) {
      try {
        const propValue = obj[key];
        cloned[key] = safeCloneDeep(propValue, visited);
      } catch {
        continue;
      }
    }
  }

  // Process Symbol keys
  for (let i = 0; i < ownSymbols.length; i++) {
    const key = ownSymbols[i];
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor) continue;

    // Skip read-only properties (getter without setter)
    if (descriptor.get && !descriptor.set) {
      continue;
    }

    // Clone enumerable symbols and symbols with setters
    if (descriptor.enumerable || descriptor.set !== undefined) {
      try {
        const propValue = obj[key];
        cloned[key] = safeCloneDeep(propValue, visited);
      } catch {
        continue;
      }
    }
  }

  return cloned as T;
}

/**
 * Process compiler configuration to make it serializable
 */
export function processCompilerConfig(config: any): Configuration {
  // Exclude plugins and infrastructureLogging before cloning
  const {
    plugins,
    infrastructureLogging: _infrastructureLogging,
    ...rest
  } = config;
  const _rest = safeCloneDeep(rest);

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
