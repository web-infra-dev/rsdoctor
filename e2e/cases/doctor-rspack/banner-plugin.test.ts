import { expect, test } from '@playwright/test';
import { Utils } from '@rsdoctor/core/build-utils';
import { getSDK, setSDK } from '@rsdoctor/core/plugins';
import { BannerPlugin, Compiler } from '@rspack/core';
import { compileByRspack } from '@scripts/test-helper';
import path from 'path';
import { createRsdoctorPlugin } from './test-utils';

let reportLoaderStartOrEndTimes = 0;

const header = `var header = 11111111; console.log(header)`;
const footer = `var footer = 22222222; console.log(footer)`;

async function rspackCompile(
  _tapName: string,
  compile: typeof compileByRspack,
) {
  const file = path.resolve(__dirname, './fixtures/a.js');
  const loader = path.resolve(__dirname, './fixtures/loaders/comment.js');

  const esmLoader = path.resolve(
    __dirname,
    './fixtures/loaders/esm-serialize-query-to-comment.mjs',
  );

  const res = await compile(file, {
    resolve: {
      extensions: ['.ts', '.js'],
    },
    output: {
      path: path.join(__dirname, '../doctor-rspack/dist'),
    },
    module: {
      rules: [
        {
          test: /\.js/,
          use: loader,
        },
        {
          test: /\.js/,
          use: esmLoader,
        },
        {
          test: /\.[jt]s$/,
          use: {
            loader: 'builtin:swc-loader',
            options: {
              sourceMap: true,
              jsc: {
                parser: {
                  syntax: 'typescript',
                },
                externalHelpers: true,
                preserveAllComments: false,
              },
            },
          },
          type: 'javascript/auto',
        },
      ],
    },
    plugins: [
      // @ts-ignore
      createRsdoctorPlugin({}),
      {
        name: 'Foo',
        apply(compiler: Compiler) {
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
      new BannerPlugin({
        test: /\.js/,
        banner: header,
        raw: true,
      }),
      new BannerPlugin({
        test: /\.js/,
        banner: footer,
        raw: true,
        footer: true,
      }),
    ],
  });

  return res;
}

test('rspack banner plugin', async () => {
  const tapName = 'Foo';
  await rspackCompile(tapName, compileByRspack);
  const sdk = getSDK();

  // @ts-ignore
  const bundle = Utils.parseBundle(
    path.join(__dirname, './fixtures/rspack-banner-plugin.js'),
    // @ts-ignore
    sdk.getStoreData().moduleGraph.modules,
  );

  expect(JSON.stringify(bundle.modules)).toBe(
    '{"":{"size":313,"sizeConvert":"313 B","content":"function (\\n      __unused_webpack_module,\\n      __webpack_exports__,\\n      __webpack_require__,\\n    ) {\\n      \'use strict\';\\n      __webpack_require__.r(__webpack_exports__);\\n      __webpack_require__.d(__webpack_exports__, {\\n        a: function () {\\n          return a;\\n        },\\n      });\\n      var a = 1;\\n    }"}}',
  );
  const res = sdk.getStoreData().chunkGraph;
  expect(res.assets[0].content).toContain(header);
  expect(res.assets[0].content).toContain('RSDOCTOR_START');
  expect(res.assets[0].content).toContain('RSDOCTOR_END');
});
