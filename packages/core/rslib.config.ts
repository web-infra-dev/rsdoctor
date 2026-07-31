import { defineConfig } from '@rslib/core';
import { fileURLToPath } from 'node:url';
import { esmConfig, pluginsConfig } from '../../scripts/rslib.base.config';

const htmlParserStub = fileURLToPath(
  new URL(
    './src/rules/rules/ecma-version-check/htmlParserStub.ts',
    import.meta.url,
  ),
);

const externals = [
  '@rsdoctor/client',
  '@rsdoctor/shared',
  '@rsdoctor/shared/collection',
  '@rsdoctor/shared/common-browser',
  '@rsdoctor/shared/graph',
  '@rsdoctor/shared/types',
  '@rspack/core',
  /^caniuse-lite(?:\/|$)/,
  'lodash',
  'semver',
  'source-map',
];

export default defineConfig({
  resolve: {
    alias: {
      // This rule always passes JavaScript source to CheckSyntax, so its HTML
      // parser branch is unreachable and should not inflate the core bundle.
      htmlparser2: htmlParserStub,
    },
  },
  lib: [
    {
      ...esmConfig,
      bundle: true,
      source: {
        entry: {
          index: './src/index.ts',
          'probe-loader': './src/build-utils/build/loader/probeLoader.ts',
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
