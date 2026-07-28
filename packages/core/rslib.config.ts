import { defineConfig } from '@rslib/core';
import { esmConfig, pluginsConfig } from '../../scripts/rslib.base.config';

const externals = [
  '@rsdoctor/client',
  '@rsdoctor/shared',
  '@rsdoctor/shared/types',
  '@rspack/core',
  'lodash',
  'semver',
  'source-map',
];

export default defineConfig({
  lib: [
    {
      ...esmConfig,
      bundle: true,
      source: {
        entry: {
          index: './src/index.ts',
          'proxy-loader': './src/proxy-loader.ts',
        },
      },
      dts: {
        build: false,
        tsgo: true,
      },
      output: {
        ...esmConfig.output,
        filename: {
          js: '[name].js',
        },
        externals,
      },
      shims: {
        esm: {
          __dirname: true,
          require: true,
        },
      },
    },
  ],
  plugins: pluginsConfig,
});
