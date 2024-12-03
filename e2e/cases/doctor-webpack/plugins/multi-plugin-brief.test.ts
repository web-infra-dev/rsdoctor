import { expect, test } from '@playwright/test';
import { getSDK } from '@rsdoctor/core/plugins';
import { compileByWebpack5 } from '@scripts/test-helper';
import path from 'path';
import { Compiler } from 'webpack';
import { createRsdoctorMultiPlugin } from '../test-utils';

async function webpack(tapName: string, compile: typeof compileByWebpack5) {
  const file = path.resolve(__dirname, '../fixtures/a.js');
  const loader = path.resolve(__dirname, '../fixtures/loaders/comment.js');
  const res = await compile(file, {
    module: {
      rules: [
        {
          test: /\.js/,
          use: loader,
        },
      ],
    },
    plugins: [
      createRsdoctorMultiPlugin({
        mode: 'brief',
        brief: {
          reportHtmlName: '111.html',
          writeDataJson: false,
        },
      }),
      {
        name: tapName,
        apply(compiler: Compiler) {
          compiler.hooks.done.tapPromise(tapName, async () => {
            // nothing
          });
          compiler.hooks.thisCompilation.tap(tapName, (compilation) => {
            compilation.hooks.seal.tap(tapName, () => {
              return 'seal end';
            });
          });
        },
      },
    ],
  });
  return res;
}

test('rsdoctor webpack5 multi-plugins options tests', async () => {
  const tapName = 'Foo';
  await webpack(tapName, compileByWebpack5);
  const sdk = getSDK();
  expect(sdk.type).toBe(0);
  expect(sdk.extraConfig?.mode).toBe('brief');
  expect(sdk.extraConfig?.brief).toMatchObject({
    reportHtmlName: '111.html',
    writeDataJson: false,
  });
});
