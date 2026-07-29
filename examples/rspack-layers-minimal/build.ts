import { RsdoctorRspackMultiplePlugin } from '@rsdoctor/core';
import rspack from '@rspack/core';
import { ReactRefreshRspackPlugin } from '@rspack/plugin-react-refresh';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import config from './rspack.config.mjs';

const currentDir = dirname(fileURLToPath(import.meta.url));

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
        new ReactRefreshRspackPlugin(),
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
        path: resolve(currentDir, 'dist/node'),
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
