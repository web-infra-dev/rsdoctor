import { Linter, Rule } from '@rsdoctor/types';
import { defineRule } from '../../rule';
import type { Config } from './types';

export type { Config } from './types';

const title = 'cjs-require';

const CJS_REQUIRE_TYPE = 'cjs require';

export const rule = defineRule<typeof title, Config>(() => {
  return {
    meta: {
      code: 'E1008' as const,
      title,
      category: 'bundle',
      severity: Linter.Severity.Warn,
      defaultConfig: {
        ignore: ['node_modules'],
      },
    },
    check({ moduleGraph, report, ruleConfig }) {
      const dependencies = moduleGraph.getDependencies();

      for (const dep of dependencies) {
        if (dep.typeString !== CJS_REQUIRE_TYPE) {
          continue;
        }

        const issuerPath = dep.module.path;

        const requiredModule = dep.dependency;

        if (
          ruleConfig.ignore.some(
            (pattern) =>
              issuerPath.includes(pattern) ||
              requiredModule.path.includes(pattern),
          )
        ) {
          continue;
        }

        const detail: Linter.ReportDetailData<Rule.CjsRequireRuleStoreData> = {
          type: title,
          issuerModule: {
            id: dep.module.id,
            path: dep.module.path,
            webpackId: dep.module.webpackId,
          },
          requiredModule: {
            id: requiredModule.id,
            path: requiredModule.path,
            webpackId: requiredModule.webpackId,
          },
          request: dep.request,
        };

        const message = `"${issuerPath}" uses \`require('${dep.request}')\` (CJS require) which prevents tree-shaking of the entire module "${requiredModule.path}". Consider using \`require('${dep.request}').property\` or ESM \`import\` instead.`;

        report({ message, detail });
      }
    },
  };
});
