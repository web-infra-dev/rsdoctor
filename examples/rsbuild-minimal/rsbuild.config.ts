import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin';
import { AssetsCountLimit } from './rules/assets-count-limit';

export default defineConfig({
  plugins: [pluginReact()],
  tools: {
    bundlerChain: (chain) => {
      chain.plugin('Rsdoctor').use(RsdoctorRspackPlugin, [
        {
          disableClientServer: !process.env.ENABLE_CLIENT_SERVER,
          features: ['bundle', 'plugins', 'loader', 'resolver'],
          reportCodeType: {
            noAssetsAndModuleSource: true,
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
          mode: 'brief',
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
