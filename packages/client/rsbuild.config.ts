import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginTypeCheck } from '@rsbuild/plugin-type-check';
import { pluginNodePolyfill } from '@rsbuild/plugin-node-polyfill';
import type { Rspack, RsbuildConfig } from '@rsbuild/core';
import { pluginSass } from '@rsbuild/plugin-sass';
import serve from 'serve-static';
import path from 'path';
import fs from 'fs';
import {
  ClientEntry,
  DistPath,
  PortForCLI,
  PortForWeb,
  WebpackRsdoctorDirPath,
  WebpackStatsFilePath,
} from './config/constants';

const {
  ENABLE_DEVTOOLS_PLUGIN,
  OFFICIAL_PREVIEW_PUBLIC_PATH,
  OFFICIAL_DEMO_MANIFEST_PATH,
  ENABLE_CLIENT_SERVER,
} = process.env;

export default defineConfig(({ env }) => {
  const IS_PRODUCTION = env === 'production';

  const config: RsbuildConfig = {
    plugins: [
      pluginReact(),
      pluginNodePolyfill(),
      pluginSass(),
      pluginTypeCheck({ enable: IS_PRODUCTION }),
    ],

    source: {
      entry: {
        index: ClientEntry,
      },
      define: {
        'process.env.NODE_DEBUG': JSON.stringify(false),
        'process.env.NODE_ENV': JSON.stringify(env),
        'process.env.OFFICIAL_DEMO_MANIFEST_PATH': JSON.stringify(
          OFFICIAL_DEMO_MANIFEST_PATH,
        ),
        'process.env.LOCAL_CLI_PORT': JSON.stringify(PortForCLI),
      },
    },

    output: {
      externals: [
        '@rsbuild/core',
        '@rsbuild/plugin-node-polyfill',
        '@rsbuild/plugin-react',
      ],
      distPath: {
        root: path.basename(DistPath),
        js: 'resource/js',
        css: 'resource/css',
        svg: 'resource/svg',
        font: 'resource/font',
        image: 'resource/image',
        media: 'resource/media',
      },
      assetPrefix: IS_PRODUCTION
        ? OFFICIAL_PREVIEW_PUBLIC_PATH?.replace(/\/resource$/, '') || './'
        : './',
      cleanDistPath: IS_PRODUCTION,
      sourceMap: {
        js: false,
        css: false,
      },
      legalComments: 'none',
    },

    performance: {
      buildCache: false,
      chunkSplit: {
        strategy: 'custom',
        splitChunks: {
          cacheGroups: {
            monaco: {
              test: /node_modules\/monaco-editor\/*/,
              name: 'monaco',
              chunks: 'all',
              maxSize: 1000000,
              minSize: 500000,
            },
            react: {
              test: /node_modules\/react-*/,
              name: 'react',
              chunks: 'all',
            },
            rc: {
              test: /node_modules\/rc-*/,
              name: 'rc',
              chunks: 'all',
              maxSize: 1000000,
              minSize: 500000,
            },
            antDesign: {
              chunks: 'all',
              name: 'ant-design',
              test: /node_modules\/antd\//,
              maxSize: 1000000,
              minSize: 500000,
            },
            antDesignIcons: {
              chunks: 'all',
              name: 'ant-design-icons',
              test: /node_modules\/@ant-design\/icons/,
              maxSize: 1000000,
              minSize: 50000,
            },
            vender: {
              chunks: 'all',
              name: 'vender',
              test: /node_modules\/(acorn|lodash|i18next|socket.io-*|axios|remark-*)/,
              maxSize: 1000000,
              minSize: 200000,
            },
          },
        },
      },
    },

    tools: {
      bundlerChain: (chainConfig) => {
        if (ENABLE_DEVTOOLS_PLUGIN) {
          const { RsdoctorRspackPlugin } =
            require('../rspack-plugin/dist') as typeof import('../rspack-plugin/dist');

          class StatsWriter {
            apply(compiler: Rspack.Compiler) {
              compiler.hooks.done.tapPromise(
                { name: 'webpack-stats-json-writer', stage: 99999 },
                async (stats) => {
                  const json = stats.toJson({
                    all: false,
                    assets: true,
                    chunks: true,
                    modules: true,
                    builtAt: true,
                    hash: true,
                    ids: true,
                    version: true,
                    entrypoints: true,
                    optimizationBailout: true,
                  });
                  await fs.promises.writeFile(
                    WebpackStatsFilePath,
                    JSON.stringify(json, null, 2),
                    'utf-8',
                  );
                },
              );
            }
          }

          chainConfig.plugin('stats-writer').use(StatsWriter);
          chainConfig.plugin('rsdoctor').use(RsdoctorRspackPlugin, [
            {
              disableClientServer: !ENABLE_CLIENT_SERVER,
            },
          ]);
        }
      },
    },

    html: {
      title: 'Rsdoctor',
    },

    server: {
      port: PortForWeb,
      historyApiFallback: true,
      open: ENABLE_CLIENT_SERVER ? undefined : true,
    },

    dev: {
      setupMiddlewares: [
        (middlewares) => {
          if (fs.existsSync(WebpackRsdoctorDirPath)) {
            const fn = serve(WebpackRsdoctorDirPath, {
              index: false,
              setHeaders(res) {
                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
              },
            });
            middlewares.push(fn);
          }
        },
      ],
    },
  };

  return config;
});
