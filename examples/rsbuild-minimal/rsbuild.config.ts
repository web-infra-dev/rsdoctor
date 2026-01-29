import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin';
import { AssetsCountLimit } from './rules/assets-count-limit';

export default defineConfig({
  source: {
    include: ['src/**/*.ts', 'src/**/*.tsx'],
    entry: {
      index: './src/index.tsx',
      shared: './src/utils/shared.ts',
    },
  },
  plugins: [pluginReact()],
  tools: {
    bundlerChain: (chain) => {
      chain.plugin('Rsdoctor').use(RsdoctorRspackPlugin, [
        {
          disableClientServer: !process.env.ENABLE_CLIENT_SERVER,
          features: ['resolver', 'bundle', 'plugins', 'loader'],
          output: {
            mode: 'brief',
            options: {
              type: ['json', 'html'],
            },
            reportCodeType: {
              noCode: true,
            },
          },
          linter: {
            level: 'Error',
            extends: [AssetsCountLimit],
            rules: {
              'assets-count-limit': [
                'on',
                {
                  limit: 1,
                },
              ],
              'ecma-version-check': [
                'Warn',
                {
                  ecmaVersion: 3,
                },
              ],
            },
          },
          port: 9988,
        },
      ]);
    },
  },
  output: {
    minify: false,
    filenameHash: false,
  },
  performance: {
    chunkSplit: {
      strategy: 'split-by-experience',
      override: {
        cacheGroups: {
          shared: {
            test: /[\\/]src[\\/]utils[\\/]shared\.ts$/,
            name: 'shared',
            chunks: 'async',
            priority: 20,
            reuseExistingChunk: true,
          },
        },
      },
    },
    bundleAnalyze: {
      generateStatsFile: true,
    },
  },
});
