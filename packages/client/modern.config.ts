import type { Compiler } from 'webpack';
import { appTools, defineConfig } from '@modern-js/app-tools';
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin';
import serve from 'serve-static';
import path from 'path';
import fs from 'fs';
import glob from 'glob';
import ip from 'ip';
import {
  ClientEntry,
  DistPath,
  PortForCLI,
  PortForWeb,
  RsdoctorWebpackPluginMain,
  WebpackDoctorDirPath,
  WebpackStatsFilePath,
} from './config/constants';

const { ENABLE_DEVTOOLS_PLUGIN, OFFICAL_PREVIEW_PUBLIC_PATH, OFFICAL_DEMO_MANIFEST_PATH, ENABLE_CLIENT_SERVER } =
  process.env;

  
export default defineConfig<'webpack'>((env) => {
  const IS_PRODUCTION = env.env === 'production';

  return {
    source: {
      entries: {
        index: ClientEntry,
      },
      disableDefaultEntries: true,
      define: {
        'process.env.NODE_DEBUG': JSON.stringify(false),
        'process.env.NODE_ENV': JSON.stringify(env.env),
        'process.env.OFFICAL_DEMO_MANIFEST_PATH': JSON.stringify(OFFICAL_DEMO_MANIFEST_PATH),
        'process.env.LOCAL_CLI_PORT': JSON.stringify(PortForCLI),
      },
    },
    output: {
      distPath: {
        root: path.basename(DistPath),
        html: 'template',
        js: 'resource/js',
        css: 'resource/css',
        svg: 'resource/svg',
        font: 'resource/font',
        image: 'resource/image',
        media: 'resource/media',
      },
      assetPrefix: IS_PRODUCTION
        ? // 此处不要修改！这里 production 的 publicPath 会和 sdk serve 的路径 以及 轻服务 部署的路径联动。
          // OFFICAL_PREVIEW_PUBLIC_PATH 是提供给 轻服务 部署后域名关系
          // "/" 是提供给 sdk 使用的
          OFFICAL_PREVIEW_PUBLIC_PATH?.replace(/\/resource$/, '') || '/'
        : '/',
      cleanDistPath: IS_PRODUCTION,
      disableTsChecker: !IS_PRODUCTION,
      disableSourceMap: true,
    },
    performance: {
      chunkSplit: {
        strategy: 'custom',
        splitChunks: {
          cacheGroups: {
            shadow: {
              test: /node_modules\/@byted-shadow\/*/,
              name: 'shadow',
              chunks: 'all',
            },
            react: {
              test: /node_modules\/react-*/,
              name: 'react',
              chunks: 'all',
              maxSize: 1000000,
              minSize: 200000,
            },
            monaco: {
              test: /node_modules\/monaco-editor\/*/,
              name: 'monaco',
              chunks: 'all',
              maxSize: 1000000,
              minSize: 500000,
            },
          },
        }
      },
    },
    tools: {
      tsChecker: IS_PRODUCTION ? {} : undefined,
      webpackChain: (chainConfig) => {
        chainConfig.resolve.mainFields.merge(['browser', 'module', 'main']);
        chainConfig.plugin('NodePolyfillPlugin').use(NodePolyfillPlugin, [{ excludeAliases: ['console'] }]);

        if (ENABLE_DEVTOOLS_PLUGIN) {
          const { RsdoctorWebpackPlugin } =
            require(RsdoctorWebpackPluginMain) as typeof import('../webpack-plugin/dist');

          class StatsWriter {
            apply(compiler: Compiler) {
              compiler.hooks.done.tapPromise({ name: 'webpack-stats-json-writer', stage: 99999 }, async (stats) => {
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
                });
                await fs.promises.writeFile(WebpackStatsFilePath, JSON.stringify(json, null, 2), 'utf-8');
              });
            }
          }

          chainConfig.plugin('stats-writer').use(StatsWriter);
          chainConfig.plugin('rsdoctor').use(RsdoctorWebpackPlugin, [
            {
              disableClientServer: !ENABLE_CLIENT_SERVER,
              features: {
                loader: true,
                plugins: true,
                resolver: true,
                bundle: true,
                treeShaking: true,
              },
            },
          ]);
        }
      },
      devServer: {
        historyApiFallback: true,
        setupMiddlewares: [
          (middlewares) => {
            if (fs.existsSync(WebpackDoctorDirPath)) {
              const fn = serve(WebpackDoctorDirPath, {
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
    },
    dev: {
      startUrl: ENABLE_CLIENT_SERVER ? undefined : `http://${ip.address()}:${PortForWeb}`,
      port: PortForWeb,
    },
    plugins: [
      appTools({}),
      {
        // use to move html files to correct path, because of html dest path will match in TLB system.
        name: 'MOVE_OUTPUT_HTML_FILES',
        setup() {
          return {
            afterBuild() {
              const dir = path.resolve(DistPath, './template');
              const htmls = glob.sync('**/**.html', { cwd: dir });

              htmls.forEach((html) => {
                const prevPath = path.resolve(dir, html);
                const prevDir = path.dirname(prevPath);
                const curtPath = path.resolve(dir, path.basename(prevPath));
                fs.copyFileSync(prevPath, curtPath);
                // fs.rmSync(prevDir, { recursive: true });
              });
            },
          };
        },
      },
    ],
}});