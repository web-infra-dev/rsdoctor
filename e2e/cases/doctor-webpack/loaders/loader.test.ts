import { expect, test } from '@playwright/test';
import { getSDK } from '@rsdoctor/core/plugins';
import { compileByWebpack5 } from '@scripts/test-helper';
import os from 'os';
import path from 'path';
import { createRsdoctorPlugin } from '../test-utils';

const file = path.resolve(__dirname, '../fixtures/a.js');
const loaderPath = path.resolve(
  __dirname,
  '../fixtures/loaders/serialize-query-to-comment.cjs',
);

async function webpack5(query?: string) {
  const res = await compileByWebpack5(query ? `${file}${query}` : file, {
    module: {
      rules: [
        {
          oneOf: [
            {
              test: /\.js$/,
              loader: loaderPath,
            },
          ],
          use: [],
        },
      ],
    },
    // @ts-ignore
    plugins: [createRsdoctorPlugin()],
  });
  return res;
}

test('webpack5 loader rule.use maybe empty array with oneOf', async () => {
  const codeTransformed =
    os.EOL === '\n'
      ? `console.log('a');\n\n// ${JSON.stringify('')}`
      : `console.log('a');\r\n\n// ${JSON.stringify('')}`;

  await webpack5();

  const storeData = getSDK()
    ? getSDK()?.getStoreData() || { loader: [] }
    : { loader: [] };
  expect(storeData?.loader).toHaveLength(1);
  os.EOL === '\n' &&
    expect(storeData?.loader?.[0].loaders[0].result).toEqual(codeTransformed);
});
