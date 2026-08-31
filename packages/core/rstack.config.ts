import { fileURLToPath } from 'node:url';
import { define } from 'rstack';
import { esmConfig, pluginsConfig } from '@scripts/config/lib';

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

define.lib({
  resolve: {
    alias: {
      // This rule always passes JavaScript source to CheckSyntax, so its HTML
      // parser branch is unreachable and should not inflate the core bundle.
      htmlparser2: htmlParserStub,
    },
  },
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
  plugins: pluginsConfig,
});

define.test(async () => {
  const { baseConfig } = await import('@scripts/config/test');

  return baseConfig;
});
