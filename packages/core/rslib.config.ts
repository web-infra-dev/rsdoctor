import { defineConfig } from '@rslib/core';
import { esmPackageBundleless } from '../../scripts/rslib.base.config';

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
  ...esmPackageBundleless,
  lib: [
    {
      bundle: false,
      format: 'esm',
      syntax: 'es2021',
      dts: {
        build: false,
        tsgo: true,
      },
      output: {
        filename: {
          js: '[name].js',
        },
        externals,
      },
      shims: {
        esm: {
          require: true,
        },
      },
    },
  ],
});
