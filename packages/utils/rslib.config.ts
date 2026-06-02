import { defineConfig, type LibConfig } from '@rslib/core';
import { join } from 'path';
import {
  cjsConfig,
  esmConfig,
  pluginsConfig,
} from '../../scripts/rslib.base.config';

const prebundleConfigPath = join(__dirname, 'prebundle.config.mjs');
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
  '@rsdoctor/types',
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

const mainEntry = {
  common: './src/common/index.ts',
  build: './src/build/index.ts',
  error: './src/error/index.ts',
  ruleUtils: './src/rule-utils/index.ts',
  logger: './src/logger.ts',
};

// Main entries: bundled JS, bundleless dts via tsc (`dts.build`). These touch
// node `fs` (`fs-extra`), which `dts.bundle` (API Extractor) cannot analyze.
const mainLib = (base: LibConfig): LibConfig => ({
  ...base,
  source: { entry: mainEntry },
  output: { ...base.output, externals },
});

// `collection` re-exports from `es-toolkit/compat`; bundle its `.d.ts` so its
// types inline es-toolkit (via `dts.bundle` / API Extractor). Kept in a
// separate lib (its own `source.entry`, no top-level entry to merge in) so the
// fs-touching main entries never enter the API Extractor program.
const collectionLib = (base: LibConfig): LibConfig => {
  const baseDts = typeof base.dts === 'object' ? base.dts : {};
  return {
    ...base,
    bundle: true,
    source: { entry: { collection: './src/common/collection.ts' } },
    dts: {
      autoExtension: baseDts.autoExtension,
      bundle: { bundledPackages: ['es-toolkit'] },
    },
  };
};

const dualFormat = [esmConfig, cjsConfig];

export default defineConfig({
  lib: [...dualFormat.map(mainLib), ...dualFormat.map(collectionLib)],
  plugins: pluginsConfig,
});
