import { expect, test } from '@playwright/test';
import { getSDK, setSDK } from '@rsdoctor/core/plugins';
import { compileByRspack } from '@scripts/test-helper';
import { BannerPlugin, Compiler } from '@rspack/core';
import path from 'path';
import fse from 'fs-extra';
import { createRsdoctorPlugin } from './test-utils';
import { parseBundle } from '../../node_modules/@rsdoctor/core/dist/build-utils/build/utils/parseBundle';

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
        name: 'XXX',
        apply(compiler: Compiler) {
          compiler.hooks.beforeRun.tapPromise(
            { name: 'XXX', stage: 99999 },
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
  const tapName = 'XXX';
  await rspackCompile(tapName, compileByRspack);
  const sdk = getSDK();
  const bundleData = fse.readFileSync(
    path.join(
      __dirname,
      './banner-plugin.test.ts-snapshots/rspack-banner-plugin-1-darwin.txt',
    ),
  );
  fse.writeFileSync(
    path.join(
      __dirname,
      './banner-plugin.test.ts-snapshots/rspack-banner-plugin-1-darwin.js',
    ),
    bundleData.toString(),
  );
  // @ts-ignore
  const bundle = parseBundle(
    path.join(
      __dirname,
      './banner-plugin.test.ts-snapshots/rspack-banner-plugin-1-darwin.js',
    ),
    sdk.getStoreData().moduleGraph.modules,
  );

  expect(JSON.stringify(bundle.modules)).toMatchSnapshot({
    name: 'banner-snapshot',
  });
  const res = sdk.getStoreData().chunkGraph;
  expect(res.assets[0].content).toMatchSnapshot();
});
