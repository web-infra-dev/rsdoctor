import { defineRule } from '@rsdoctor/core/rules';

export const AssetsCountLimit = defineRule(() => ({
  meta: {
    category: 'bundle',
    severity: 'Warn',
    title: 'assets-count-limit',
    defaultConfig: {
      limit: 10,
    },
  },
  check({ chunkGraph, report, ruleConfig }) {
    const assets = chunkGraph.getAssets();

    if (assets.length > ruleConfig.limit) {
      report({
        message: 'The count of assets is bigger than limit',
        detail: {
          type: 'link',
          link: 'https://rsdoctor.rs/zh/guide/start/quick-start', // This link just for show case.
        },
      });
    }
  },
}));
