import { expect, test } from '@playwright/test';
import { getSDK } from '@rsdoctor/core/plugins';
import path from 'path';
import { compileByWebpack5 } from '@scripts/test-helper';
import { createRsdoctorPlugin } from './test-utils';

async function webpack(compile: typeof compileByWebpack5) {
  const file = path.resolve(__dirname, './fixtures/b.js');
  const loader = path.resolve(__dirname, './fixtures/loaders/comment.js');
  const res = await compile(file, {
    module: {
      rules: [
        {
          test: /\.js/,
          use: loader,
        },
      ],
    },
    experiments: {
      backCompat: false,
    },
    optimization: {
      minimize: true,
    },
    plugins: [createRsdoctorPlugin({})],
  });
  return res;
}

test('webpack5', async () => {
  await webpack(compileByWebpack5);
  const sdk = getSDK();
  const { configs } = sdk.getStoreData();

  expect(configs[0]).toBeInstanceOf(Object);
  expect(configs[0].name).toEqual('webpack');
});
