import { defineRule } from '@rsdoctor/core/rules';

// Example dynamic rule: Check for large bundle sizes
const BundleSizeRule = defineRule(() => ({
  meta: {
    category: 'bundle',
    severity: 'Warn',
    title: 'bundle-size-limit',
    defaultConfig: {
      maxSize: 1024 * 1024, // 1MB
    },
  },
  check({ chunkGraph, report, ruleConfig }) {
    const assets = chunkGraph.getAssets();
    const totalSize = assets.reduce((total, asset) => total + asset.size, 0);

    if (totalSize > ruleConfig.maxSize) {
      report({
        message: `Bundle size (${(totalSize / 1024 / 1024).toFixed(2)}MB) exceeds limit (${(ruleConfig.maxSize / 1024 / 1024).toFixed(2)}MB)`,
        detail: {
          type: 'link',
          link: 'https://rsdoctor.rs/guide/rules/bundle-size-limit',
        },
      });
    }
  },
}));

// Example dynamic rule: Check for unused dependencies
const UnusedDependenciesRule = defineRule(() => ({
  meta: {
    category: 'bundle',
    severity: 'Warn',
    title: 'unused-dependencies',
    defaultConfig: {
      ignorePatterns: ['@types/*', '*.d.ts'],
    },
  },
  check({ moduleGraph, report, ruleConfig }) {
    const modules = moduleGraph.getModules();
    const usedModules = new Set();

    // Collect all used modules
    modules.forEach((module) => {
      if (module.dependencies) {
        module.dependencies.forEach((dep) => {
          if (dep.module) {
            usedModules.add(dep.module.identifier);
          }
        });
      }
    });

    // Check for potentially unused modules
    modules.forEach((module) => {
      if (
        !usedModules.has(module.identifier) &&
        !ruleConfig.ignorePatterns.some((pattern) =>
          module.identifier.includes(pattern),
        )
      ) {
        report({
          message: `Potentially unused module: ${module.identifier}`,
          detail: {
            type: 'text',
            text: 'This module may not be used in the final bundle',
          },
        });
      }
    });
  },
}));

// Export the rules
export const rules = [BundleSizeRule, UnusedDependenciesRule];

// Export package metadata
export const meta = {
  name: 'dynamic-rules-example',
  version: '1.0.0',
  description: 'Example dynamic rules package for rsdoctor',
  rsdoctorVersion: '^1.0.0',
};
