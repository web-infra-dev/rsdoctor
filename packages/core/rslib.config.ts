import { defineConfig, rspack } from '@rslib/core';
import { dualPackageBundleless } from '../../scripts/rslib.base.config';
import prebundleConfig from './prebundle.config.mjs';

const regexpMap: Record<string, RegExp> = {};

for (const item of prebundleConfig.dependencies) {
  const depName = typeof item === 'string' ? item : item.name;
  if (typeof item !== 'string' && item.dtsOnly) {
    continue;
  }

  regexpMap[depName] = new RegExp(`compiled[\\/]${depName}(?:[\\/]|$)`);
}

const externalsPrebundle = [
  ({ request }: { request?: string }, callback: any) => {
    if (request) {
      if (
        prebundleConfig.dependencies.includes(request) &&
        request !== '@rsbuild/plugin-check-syntax'
      ) {
        return callback(undefined, `../../../compiled/${request}/index.js`);
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

const externals = [
  // Externalize workspace packages
  '@rsdoctor/graph',
  '@rsdoctor/sdk',
  '@rsdoctor/types',
  '@rsdoctor/utils',
  'lodash',
  'semver',
  'source-map',
  ...externalsPrebundle,
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
            // For ESM files, we don't need to add export since it's already exported
            return '';
          },
          footer: true,
          raw: true,
        }),
      ],
    },
  },
});
