import { defineConfig } from '@rslib/core';
import { dualPackageBundleless } from '../../scripts/rslib.base.config';

const externals = [
  '@rsdoctor/types',
  'buffer',
  'es-toolkit',
  'path-browserify',
  'source-map',
];

export default defineConfig({
  ...dualPackageBundleless,
  lib: [
    {
      bundle: false,
      format: 'esm',
      syntax: 'es2021',
      dts: {
        build: true,
      },
      redirect: {
        dts: {
          extension: true,
        },
      },
      output: {
        filename: {
          js: '[name].js',
        },
        externals,
      },
    },
    {
      bundle: false,
      format: 'cjs',
      syntax: 'es2021',
      dts: {
        build: true,
        autoExtension: true,
      },
      output: {
        filename: {
          js: '[name].cjs',
        },
        externals,
      },
    },
  ],
});
