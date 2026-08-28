import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { RsdoctorRspackPlugin } from '@rsdoctor/core';
import { AssetsCountLimit } from './rules/assets-count-limit';

export default defineConfig({
  source: {
    entry: {
      index: './src/index.tsx',
      shared: './src/utils/shared.ts',
    },
  },
  plugins: [pluginReact()],
  tools: {
    rspack: {
      plugins: [
        new RsdoctorRspackPlugin({
          disableClientServer: !process.env.ENABLE_CLIENT_SERVER,
          features: ['resolver', 'bundle', 'plugins', 'loader'],
          // output: {
          //   mode: 'brief',
          //   options: {
          //     type: ['json', 'html'],
          //   },
          //   reportCodeType: 'noCode',
          // },
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
        }),
      ],
    },
  },
  output: {
    minify: false,
    filenameHash: false,
  },
  splitChunks: {
    preset: 'default',
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
});
