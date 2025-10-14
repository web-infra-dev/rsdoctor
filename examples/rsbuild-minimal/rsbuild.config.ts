import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { AssetsCountLimit } from './rules/assets-count-limit';

export default defineConfig({
  plugins: [pluginReact()],
  tools: {
    bundlerChain: (chain) => {
      chain.plugin('Rsdoctor').use(RsdoctorRspackPlugin, [
        {
          disableClientServer: !process.env.ENABLE_CLIENT_SERVER,
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
                  limit: 1, // rule custom configs
                },
              ],
            },
            // Dynamic rules configuration
            dynamicRules: {
              packages: [
                {
                  package: './rules/dynamic-rules-example',
                  enabled: true,
                  rules: {
                    'bundle-size-limit': ['on', { maxSize: 1024 * 1024 }], // 1MB
                    'unused-dependencies': 'warn',
                  },
                },
              ],
            },
          },
          port: 9988,
          // mode: 'brief',
        },
      ]);
    },
  },
  output: {
    minify: false,
    filenameHash: false,
    sourceMap: {
      js: 'cheap-module-source-map',
      css: true,
    },
  },
});
