import { expect, test } from '@playwright/test';
import { getSDK, setSDK } from '@rsdoctor/core/plugins';
import { compileByRspack } from '@scripts/test-helper';
import { Compiler, RuleSetRule } from '@rspack/core';
import os from 'os';
import path from 'path';
import { createRsdoctorPlugin } from './test-utils';

let reportLoaderStartOrEndTimes = 0;

async function rspackCompile(tapName: string, compile: typeof compileByRspack) {
  const file = path.resolve(__dirname, './fixtures/a.js');
  const loader = path.resolve(__dirname, './fixtures/loaders/comment.js');
  const esmLoader = path.resolve(
    __dirname,
    './fixtures/loaders/esm-serialize-query-to-comment.mjs',
  );
  const esmLoaderJs = path.resolve(
    __dirname,
    './fixtures/loaders/esm/esm-serialize-query-to-comment.js',
  );
  const res = await compile(file, {
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
          test: /\.js/,
          use: esmLoaderJs,
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
          compiler.hooks.done.tapPromise(tapName, async () => {
            // nothing
          });
          compiler.hooks.thisCompilation.tap(tapName, (compilation) => {
            compilation.hooks.processAssets.tap(tapName, () => {
              return 'processAssets end';
            });
          });
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
    ],
  });

  return res;
}

test('rspack plugin intercept', async () => {
  const tapName = 'XXX';
  await rspackCompile(tapName, compileByRspack);
  const sdk = getSDK();
  const { done, thisCompilation } = sdk.getStoreData().plugin;
  const loaderData = sdk.getStoreData().loader;
  expect(loaderData[0].loaders.length).toBe(1);
  expect(reportLoaderStartOrEndTimes).toBeGreaterThan(0);
  const doneData = done.filter((e) => e.tapName === tapName);
  expect(doneData).toHaveLength(1);
  expect(doneData[0].type).toEqual('promise');
  expect(doneData[0].result).toBeNull();
  const sealData = thisCompilation.filter((e) => e.tapName === tapName);
  expect(sealData).toHaveLength(1);
  expect(sealData[0].type).toEqual('sync');
  expect(sealData[0].result).toBeNull();
});

test('rspack data store', async () => {
  const tapName = 'XXX';
  await rspackCompile(tapName, compileByRspack);
  const sdk = getSDK();
  const datas = sdk.getStoreData();
  expect(datas.errors.length).toBe(2);
  const graphData = datas.moduleGraph;
  const configs = datas.configs;

  os.EOL === '\n'
    ? expect(
        graphData.modules[0].webpackId.indexOf('/fixtures/a.js'),
      ).toBeGreaterThan(0)
    : expect(
        graphData.modules[0].webpackId.indexOf('\\fixtures\\a.js'),
      ).toBeGreaterThan(0);

  graphData.modules.forEach((mod) => (mod.webpackId = ''));
  expect(graphData.modules[0].size).toEqual({
    sourceSize: 68,
    transformedSize: 91,
    parsedSize: 0,
  });
  expect(graphData.modules[0].path).toMatch('/fixtures/a.js');
  // @ts-ignore
  const ruleLengthList = configs[0].config.module?.rules?.map(
    (_rule) => (_rule as RuleSetRule)?.use?.length,
  );
  expect(ruleLengthList).toEqual([1, 3, 3]);
});
