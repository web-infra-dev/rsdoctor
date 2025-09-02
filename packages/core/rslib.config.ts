import { defineConfig, rspack } from '@rslib/core';
import { dualPackageBundleless } from '../../scripts/rslib.base.config';

const externals = [
  // Externalize workspace packages
  '@rsdoctor/graph',
  '@rsdoctor/sdk',
  '@rsdoctor/types',
  '@rsdoctor/utils',
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
    {
      bundle: false,
      format: 'cjs',
      syntax: 'es2021',
      dts: {
        build: false,
      },
      output: {
        filename: {
          js: '[name].cjs',
        },
        externals,
      },
      shims: {
        cjs: {
          'import.meta.url': true,
        },
      },
    },
  ],
  tools: {
    rspack: {
      plugins: [
        new rspack.BannerPlugin({
          banner: (args) => {
            if (args.filename === 'inner-plugins/loaders/proxy.cjs') {
              return 'module.exports = loaderModule; // This is a proxy loader, do not remove this line';
            }
            return '';
          },
          footer: true,
          raw: true,
        }),
      ],
    },
  },
});
