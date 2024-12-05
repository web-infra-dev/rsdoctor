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
    async check({ chunkGraph, report, ruleConfig, root }) {
      for (const asset of chunkGraph.getAssets()) {
        if (path.extname(asset.path) !== '.js') {
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
        const checkSyntax = new CheckSyntax({
          exclude,
          excludeOutput,
          ecmaVersion,
          rootPath: root,
          targets: finalTargets,
        });
        await checkSyntax.check(asset.path, asset.content);
        checkSyntax.errors.forEach((err) => {
          report({
            message: `Find some syntax that does not match "ecmaVersion <= ${checkSyntax.ecmaVersion}"`,
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
