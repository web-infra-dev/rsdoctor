import path from 'path';
import { CheckSyntax } from '@rsbuild/plugin-check-syntax';
import { parse } from 'acorn';
import { loadConfig } from 'browserslist-load-config';

import { defineRule } from '../../rule';
import type { Config } from './types';

import { Linter } from '@rsdoctor/shared/types';
export type { Config } from './types';

const title = 'ecma-version-check';

function isExcludedOutput(
  filepath: string,
  exclude: Config['excludeOutput'],
): boolean {
  if (!exclude) return false;

  const conditions = Array.isArray(exclude) ? exclude : [exclude];
  const normalizedPath = filepath.replace(/\\/g, '/');

  return conditions.some((condition) => {
    if (typeof condition === 'function') return condition(filepath);
    if (typeof condition === 'string') {
      return normalizedPath.startsWith(condition.replace(/\\/g, '/'));
    }

    const lastIndex = condition.lastIndex;
    condition.lastIndex = 0;
    const isExcluded = condition.test(normalizedPath);
    condition.lastIndex = lastIndex;
    return isExcluded;
  });
}

export const rule: Linter.RuleData<Config, typeof title> = defineRule<
  typeof title,
  Config
>(() => {
  return {
    meta: {
      code: 'E1004' as const,
      title,
      category: 'bundle',
      severity: Linter.Severity.Warn,
      defaultConfig: {
        ecmaVersion: undefined,
      },
    },
    async check({ chunkGraph, report, ruleConfig, root, configs }) {
      const assets = chunkGraph.getAssets().filter((asset) => {
        // Lynx bundles are binary containers, not JavaScript source.
        if (asset.path.endsWith('.lynx.bundle')) return false;

        const extension = path.extname(asset.path);
        return extension === '.js' || extension === '.bundle';
      });
      if (!assets.length) return;

      const {
        exclude,
        excludeErrorMessage,
        excludeOutput,
        targets,
        ecmaVersion,
      } = ruleConfig;
      const hasEcmaVersion = typeof ecmaVersion !== 'undefined';
      const buildConfig = configs[0]?.config;
      const context = buildConfig?.context || root;
      const finalTargets =
        targets ??
        (hasEcmaVersion
          ? []
          : loadConfig({
              path: context,
              env: 'production',
            })) ??
        [];

      // Explicitly passing an empty targets array keeps the rule disabled.
      if (!finalTargets.length && !hasEcmaVersion) return;

      const outputDir = buildConfig?.output?.path || path.resolve(root, 'dist');
      const checkSyntax = new CheckSyntax({
        exclude,
        excludeErrorMessage,
        excludeOutput,
        ecmaVersion,
        rootPath: context,
        targets: finalTargets,
      });
      const canRetryAsModule =
        buildConfig?.output?.module === true &&
        (typeof checkSyntax.ecmaVersion !== 'number' ||
          checkSyntax.ecmaVersion >= 6);

      for (const asset of assets) {
        const assetPath = path.resolve(outputDir, asset.path);
        if (isExcludedOutput(assetPath, excludeOutput)) continue;

        const errorCount = checkSyntax.errors.length;
        await checkSyntax.check(assetPath, asset.content);

        // CheckSyntax parses as a script. Retry only for ES2015+ module output.
        if (canRetryAsModule && checkSyntax.errors.length > errorCount) {
          try {
            parse(asset.content, {
              ecmaVersion: checkSyntax.ecmaVersion,
              sourceType: 'module',
            });
            checkSyntax.errors.length = errorCount;
          } catch {
            // The syntax is invalid under both grammars; keep the original error.
          }
        }
      }

      checkSyntax.errors.forEach((err) => {
        report({
          message: `Found syntax that does not match "ecmaVersion <= ${checkSyntax.ecmaVersion}"`,
          detail: {
            error: err,
            type: 'link',
          },
        });
      });
    },
  };
});
