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

function getExternals(_libConfig: { format?: string }) {
  return [
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
        if (request === 'safer-buffer' && _libConfig.format === 'esm') {
          return callback(undefined, 'safer-buffer', 'commonjs');
        }
      }
      callback();
    },
  ];
}

export default defineConfig({
  ...dualPackage,
  lib: dualPackage.lib.map((libConfig) => ({
    ...libConfig,
    output: {
      ...libConfig.output,
      externals: getExternals(libConfig),
    },
    shims: {
      esm: {
        __filename: true,
        __dirname: true,
        require: true,
      },
      cjs: {
        'import.meta.url': true,
      },
    },
  })),
});
