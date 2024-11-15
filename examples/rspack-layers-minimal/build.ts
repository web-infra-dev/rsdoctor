import rspack from '@rspack/core';
import { resolve } from 'path';
const config = require('./rspack.config.js');
const ReactRefreshPlugin = require('@rspack/plugin-react-refresh');
const { RsdoctorRspackMultiplePlugin } = require('@rsdoctor/rspack-plugin');

// console.log(config)

function rspackBuild(config: rspack.Configuration) {
  return new Promise<void>((resolve) => {
    rspack.rspack(config, (err, stats) => {
      if (err) {
        throw err;
      }

      console.log();

      if (stats) {
        console.log(
          stats.toString({
            chunks: false,
            chunkModules: false,
            colors: true,
            modules: false,
            children: false,
          }),
        );
      }

      resolve();
    });
  });
}

async function build() {
  await Promise.all([
    rspackBuild({
      ...config,
      name: 'Builder 1',
      target: 'web',
      plugins: [
        new ReactRefreshPlugin(),
        new RsdoctorRspackMultiplePlugin({
          stage: 0,
          disableClientServer: false,
          features: ['bundle', 'plugins', 'loader'],
        }),
        new rspack.HtmlRspackPlugin({
          template: './index.html',
        }),
        new rspack.CopyRspackPlugin({
          patterns: [
            {
              from: 'public',
            },
          ],
        }),
      ],
    }),
    rspackBuild({
      ...config,
      entry: './src/index.ts',
      mode: 'none',
      name: 'Builder 2',
      target: 'node',
      output: {
        path: resolve(__dirname, 'dist/node'),
        filename: 'index.js',
      },
      plugins: [
        new RsdoctorRspackMultiplePlugin({
          stage: 1,
          disableClientServer: false,
          features: ['bundle', 'plugins', 'loader'],
        }),
        new rspack.CopyRspackPlugin({
          patterns: [
            {
              from: 'public',
            },
          ],
        }),
      ],
    }),
  ]);
}

build();
