import { expect, test } from '@playwright/test';
import { getSDK } from '@rsdoctor/core/plugins';
import { compileByWebpack5 } from '@scripts/test-helper';
import os from 'os';
import path from 'path';
import qs from 'querystring';
import { createRsdoctorPlugin } from '../test-utils';

const file = path.resolve(__dirname, '../fixtures/a.js');
const loaderPath = path.resolve(
  __dirname,
  '../fixtures/loaders/serialize-resource-query-to-comment.js',
);

async function webpack5(resourceQuery?: string) {
  const res = await compileByWebpack5(
    resourceQuery ? `${file}${resourceQuery}` : file,
    {
      module: {
        rules: [
          {
            test: /\.js$/,
            use: [
              {
                loader: loaderPath,
              },
            ],
          },
        ],
      },
      // @ts-ignore
      plugins: [createRsdoctorPlugin()],
    },
  );
  return res;
}

test('webpack5', async () => {
  const codeTransformed =
    os.EOL === '\n'
      ? `console.log('a');\n\n// ${JSON.stringify('')}`
      : `console.log('a');\r\n\n// ${JSON.stringify('')}`;

  await webpack5();

  const { loader } = getSDK().getStoreData();
  expect(loader).toHaveLength(1);
  os.EOL === '\n' &&
    expect(loader[0].loaders[0].result).toEqual(codeTransformed);
});

test('this.resourceQuery exists', async () => {
  // number are not parsed: https://github.com/webpack/loader-utils/tree/v2.0.0-branch#parsequery
  const resourceQuery = { test: '111' };
  const resourceQuerystring = `?${qs.stringify(resourceQuery)}`;
  const codeTransformed =
    os.EOL === '\n'
      ? `console.log('a');\n\n// ${JSON.stringify(
          resourceQuerystring,
        )}\n// ${JSON.stringify(resourceQuery)}`
      : `console.log('a');\r\n\n// ${JSON.stringify(
          resourceQuerystring,
        )}\n// ${JSON.stringify(resourceQuery)}`;

  await webpack5(resourceQuerystring);

  const { loader } = getSDK().getStoreData();
  expect(loader).toHaveLength(1);
  expect(loader[0].loaders[0].result).toEqual(codeTransformed);
});
