import path from 'path';
import { CheckSyntax } from '@rsbuild/plugin-check-syntax';
import { loadConfig } from 'browserslist-load-config';

import { defineRule } from '../../rule';
import { Config } from './types';

import { Linter } from '@rsdoctor/types';
export type { Config } from './types';

const title = 'ecma-version-check';

export const rule = defineRule<typeof title, Config>(() => {
  return {
    meta: {
      code: 'E1004' as const,
      title,
      category: 'bundle',
      severity: Linter.Severity.Warn,
      defaultConfig: {
        ecmaVersion: undefined,
        targets: [],
      },
    },
    async check({ chunkGraph, report, ruleConfig, root, configs }) {
      for (const asset of chunkGraph.getAssets()) {
        if (
          path.extname(asset.path) !== '.js' &&
          path.extname(asset.path) !== '.bundle'
        ) {
          continue;
        }

        const browserslistConfig = loadConfig({
          path: root,
          env: 'production',
        });
        const { exclude, excludeOutput, targets, ecmaVersion } = ruleConfig;
        const finalTargets = targets || browserslistConfig || [];
        // disable check syntax
        if (!finalTargets.length && !ecmaVersion) {
          return;
        }

        const buildConfig = configs[0]?.config;
        const context = buildConfig?.context || root;
        const checkSyntax = new CheckSyntax({
          exclude,
          excludeOutput,
          ecmaVersion,
          rootPath: context,
          targets: finalTargets,
        });

        const outputDir =
          buildConfig?.output?.path || path.resolve(root, 'dist');
        const assetPath = path.resolve(outputDir, asset.path);
        await checkSyntax.check(assetPath, asset.content);
        checkSyntax.errors.forEach((err) => {
          report({
            message: `Found syntax that does not match "ecmaVersion <= ${checkSyntax.ecmaVersion}"`,
            detail: {
              error: err,
              type: 'link',
            },
          });
        });
      }
    },
  };
});
