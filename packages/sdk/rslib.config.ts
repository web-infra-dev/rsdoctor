import { defineConfig } from '@rslib/core';
import { join } from 'path';
import { dualPackage } from '../../scripts/rslib.base.config';

// Load prebundle configuration
const prebundleConfigPath = join(__dirname, './prebundle.config.mjs');
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

// Extend dualPackage config with externals
export default defineConfig({
  ...dualPackage,
  lib: dualPackage.lib.map((libConfig) => ({
    ...libConfig,
    output: {
      ...libConfig.output,
      externals,
    },
  })),
});
