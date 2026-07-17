import { defineConfig } from '@rslib/core';
import {
  dualPackage,
  dualPackageBundleless,
} from '../../scripts/rslib.base.config';

const externals = [
  '@rsdoctor/shared/collection',
  'buffer',
  'path-browserify',
  'source-map',
];

const bundlelessEntries = {
  index: ['src/**', '!src/common/collection.ts'],
};

const bundlelessLib = dualPackageBundleless.lib.map((libConfig) => ({
  ...libConfig,
  source: {
    entry: bundlelessEntries,
  },
  output: {
    ...libConfig.output,
    externals,
  },
  redirect: {
    ...libConfig.redirect,
    dts: {
      ...libConfig.redirect?.dts,
      path: false,
    },
  },
}));

const collectionLib = dualPackage.lib.map((libConfig) => ({
  ...libConfig,
  source: {
    entry: {
      collection: './src/common/collection.ts',
    },
  },
  output: {
    ...libConfig.output,
    externals,
  },
  dts: {
    bundle: {
      bundledPackages: ['es-toolkit'],
    },
    autoExtension: libConfig.format === 'cjs',
  },
}));

export default defineConfig({
  ...dualPackageBundleless,
  lib: [...bundlelessLib, ...collectionLib],
});
