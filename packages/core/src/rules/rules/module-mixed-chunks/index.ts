import { Linter, Rule } from '@rsdoctor/types';
import { Config } from './types';
import { defineRule } from '../../rule';

export type { Config } from './types';

const title = 'module-mixed-chunks';

export const rule = defineRule<typeof title, Config>(() => {
  return {
    meta: {
      code: 'E1006' as const,
      title,
      category: 'bundle',
      severity: Linter.Severity.Warn,
      defaultConfig: {
        ignore: [],
      },
    },
    check({ moduleGraph, report, ruleConfig }) {
      const modules = moduleGraph.getModules();

      for (const module of modules) {
        // Skip ignored modules
        if (
          ruleConfig.ignore.some((pattern) => module.path.includes(pattern))
        ) {
          continue;
        }

        const moduleChunks = module.getChunks();

        if (moduleChunks.length === 0) {
          continue;
        }

        // Check if module has both initial and async chunks
        const hasInitial = moduleChunks.some((chunk) => chunk.initial);
        const hasAsync = moduleChunks.some((chunk) => !chunk.initial);

        if (hasInitial && hasAsync) {
          const initialChunks = moduleChunks.filter((chunk) => chunk.initial);
          const asyncChunks = moduleChunks.filter((chunk) => !chunk.initial);

          const detail: Linter.ReportDetailData<Rule.ModuleMixedChunksRuleStoreData> =
            {
              type: title,
              module: {
                id: module.id,
                path: module.path,
                webpackId: module.webpackId,
              },
              initialChunks: initialChunks.map((chunk) => ({
                id: chunk.id,
                name: chunk.name,
              })),
              asyncChunks: asyncChunks.map((chunk) => ({
                id: chunk.id,
                name: chunk.name,
              })),
            };

          const chunkNames = moduleChunks
            .map((chunk) => chunk.name || `chunk-${chunk.id}`)
            .join(', ');
          const message = `Module "${module.path}" is included in both initial and async chunks: ${chunkNames}. This should be optimized to avoid code duplication.`;

          report({
            message,
            detail,
          });
        }
      }
    },
  };
});
