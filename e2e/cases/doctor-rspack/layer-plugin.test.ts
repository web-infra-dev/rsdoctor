import { expect, test } from '@playwright/test';
import { getSDK, setSDK } from '@rsdoctor/core/plugins';
import { compileByRspackLayers } from '@scripts/test-helper';
import { Compiler } from '@rspack/core';
import path from 'path';
import { createRsdoctorPlugin } from './test-utils';

let reportLoaderStartOrEndTimes = 0;

async function rspackCompile(
  tapName: string,
  compile: typeof compileByRspackLayers,
) {
  const file = path.resolve(__dirname, './fixtures/a.js');
  const loader = path.resolve(__dirname, './fixtures/loaders/comment.js');

  const res = await compile(file, {
    entry: {
      main: {
        import: file,
        layer: 'modern',
      },
      legacy: {
        import: file,
        layer: 'legacy',
      },
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.js/,
          use: loader,
        },
        {
          test: /\.css$/,
          use: [
            {
              loader: 'builtin:lightningcss-loader',
              options: {
                targets: 'ie 10',
              },
            },
          ],
        },
        {
          test: /\.(jsx?|tsx?)$/,
          issuerLayer: 'modern',
          use: [
            {
              loader: 'builtin:swc-loader',
              options: {
                jsc: {
                  parser: {
                    syntax: 'typescript',
                    tsx: true,
                  },
                  transform: {
                    react: {
                      runtime: 'automatic',
                    },
                  },
                },
                env: {
                  targets: ['Chrome >= 10'],
                },
              },
            },
          ],
        },
        {
          test: /\.(jsx?|tsx?)$/,
          issuerLayer: 'legacy',
          use: [
            {
              loader: 'builtin:swc-loader',
              options: {
                jsc: {
                  parser: {
                    syntax: 'typescript',
                    tsx: true,
                  },
                  transform: {
                    react: {
                      runtime: 'automatic',
                    },
                  },
                },
                env: {
                  targets: ['Chrome >= 100'],
                },
              },
            },
          ],
        },
      ],
    },
    experiments: {
      layers: true,
    },
    plugins: [
      // @ts-ignore
      createRsdoctorPlugin({}),
      {
        name: 'Foo',
        apply(compiler: Compiler) {
          compiler.hooks.done.tapPromise(tapName, async () => {
            // nothing
          });
          compiler.hooks.thisCompilation.tap(tapName, (compilation) => {
            compilation.hooks.processAssets.tap(tapName, () => {
              return 'processAssets end';
            });
          });
          compiler.hooks.beforeRun.tapPromise(
            { name: 'Foo', stage: 99999 },
            async () => {
              const sdk = getSDK();
              setSDK(
                new Proxy(sdk, {
                  get(target, key, receiver) {
                    switch (key) {
                      case 'reportLoader':
                        return null;
                      case 'reportLoaderStartOrEnd':
                        return (_data: any) => {
                          reportLoaderStartOrEndTimes += 1;
                        };
                      default:
                        return Reflect.get(target, key, receiver);
                    }
                  },
                  set(target, key, value, receiver) {
                    return Reflect.set(target, key, value, receiver);
                  },
                  defineProperty(target, p, attrs) {
                    return Reflect.defineProperty(target, p, attrs);
                  },
                }),
              );
            },
          );
        },
      },
    ],
  });

  return res;
}

test('rspack data store', async () => {
  const tapName = 'Foo';
  await rspackCompile(tapName, compileByRspackLayers);
  const sdk = getSDK();
  const datas = sdk.getStoreData();
  const graphData = datas.moduleGraph;
  const layerList = graphData.modules.map((m) => m.layer);
  expect(JSON.stringify(layerList)).toMatch(
    JSON.stringify(['modern', 'legacy', 'modern', 'legacy']),
  );
  expect(JSON.stringify(graphData.layers)).toMatch(
    JSON.stringify(['modern', 'legacy']),
  );
});
