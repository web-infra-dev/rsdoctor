import { define } from 'rstack';
import { esmConfig, pluginsConfig } from '../../scripts/lib.config.ts';

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
  dts: {
    build: true,
    tsgo: true,
  },
  source: {
    entry: bundlelessEntries,
  },
  output: {
    ...esmConfig.output,
    externals,
  },
  redirect: {
    dts: {
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
    tsgo: true,
    bundle: {
      bundledPackages: ['es-toolkit'],
    },
  },
};

define.lib({
  lib: [bundlelessLib, collectionLib],
  plugins: pluginsConfig,
});

define.test(async () => {
  const { baseConfig } = await import('../../scripts/test.config.ts');

  return baseConfig;
});
