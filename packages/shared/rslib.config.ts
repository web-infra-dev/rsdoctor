import { defineConfig } from '@rslib/core';
import { esmConfig, pluginsConfig } from '../../scripts/rslib.base.config';

const externals = [
  '@rsdoctor/shared/collection',
  'buffer',
  'path-browserify',
  'source-map',
];

const bundlelessEntries = {
  index: ['src/**', '!src/common/collection.ts'],
};

const bundlelessLib = {
  ...esmConfig,
  bundle: false,
  source: {
    entry: bundlelessEntries,
  },
  output: {
    ...esmConfig.output,
    externals,
  },
  redirect: {
    ...esmConfig.redirect,
    dts: {
      extension: true,
      path: false,
    },
  },
};

const collectionLib = {
  ...esmConfig,
  source: {
    entry: {
      collection: './src/common/collection.ts',
    },
  },
  output: {
    ...esmConfig.output,
    externals,
  },
  dts: {
    bundle: {
      bundledPackages: ['es-toolkit'],
    },
  },
};

export default defineConfig({
  lib: [bundlelessLib, collectionLib],
  plugins: pluginsConfig,
});
