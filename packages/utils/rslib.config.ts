import { defineConfig } from '@rslib/core';
import { dualPackage } from '../../scripts/rslib.base.config';
import { join } from 'path';

// Load prebundle configuration
const prebundleConfigPath = join(__dirname, 'prebundle.config.mjs');
const prebundleConfigModule = await import(prebundleConfigPath);
const prebundleConfig = prebundleConfigModule.default;

// Create regexp map for prebundled dependencies
const regexpMap: Record<string, RegExp> = {};

for (const item of prebundleConfig.dependencies) {
  const depName = typeof item === 'string' ? item : item.name;

  // Skip dtsOnly dependencies
  if (typeof item !== 'string' && item.dtsOnly) {
    continue;
  }

  regexpMap[depName] = new RegExp(`compiled[\\/]${depName}(?:[\\/]|$)`);
}

// Define externals configuration
const externals = [
  // Externalize workspace packages
  '@rsdoctor/types',
  // Externalize pre-bundled dependencies
  ({ request }: { request?: string }, callback: any) => {
    if (request) {
      // Check if the request is a prebundled dependency
      if (prebundleConfig.dependencies.includes(request)) {
        // Return the path to the prebundled file
        return callback(undefined, `../compiled/${request}/index.js`);
      }

      // Check if the request matches any regexp patterns
      const entries = Object.entries(regexpMap);
      for (const [name, test] of entries) {
        if (test.test(request)) {
          return callback(undefined, `../compiled/${name}/index.js`);
        }
      }
    }
    callback();
  },
];

export default defineConfig({
  ...dualPackage,
  source: {
    entry: {
      common: './src/common/index.ts',
      build: './src/build/index.ts',
      error: './src/error/index.ts',
      ruleUtils: './src/rule-utils/index.ts',
      logger: './src/logger.ts',
    },
  },
  lib: dualPackage.lib.map((libConfig) => ({
    ...libConfig,
    output: {
      ...libConfig.output,
      externals,
    },
  })),
});
