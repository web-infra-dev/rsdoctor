import { defineConfig } from '@rslib/core';
import { join } from 'path';
import { dualPackage } from '../../scripts/rslib.base.config';

const prebundleConfigPath = join(__dirname, './prebundle.config.mjs');
const prebundleConfigModule = await import(prebundleConfigPath);
const prebundleConfig = prebundleConfigModule.default;
const regexpMap: Record<string, RegExp> = {};

for (const item of prebundleConfig.dependencies) {
  const depName = typeof item === 'string' ? item : item.name;
  if (typeof item !== 'string' && item.dtsOnly) {
    continue;
  }

  regexpMap[depName] = new RegExp(`compiled[\\/]${depName}(?:[\\/]|$)`);
}

const externals = [
  ({ request }: { request?: string }, callback: any) => {
    if (request) {
      if (prebundleConfig.dependencies.includes(request)) {
        return callback(undefined, `../compiled/${request}/index.js`);
      }
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
  lib: dualPackage.lib.map((libConfig) => ({
    ...libConfig,
    output: {
      ...libConfig.output,
      externals,
    },
  })),
});
