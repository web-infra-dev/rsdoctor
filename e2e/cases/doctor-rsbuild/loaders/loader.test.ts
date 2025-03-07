import { expect, test } from '@playwright/test';
import { getSDK } from '@rsdoctor/core/plugins';
import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin';
import { createStubRsbuild } from '@scripts/test-helper';
import path from 'path';

const file = path.resolve(__dirname, '../fixtures/a.js');

async function rsbuild(_query?: string) {
  const res = await createStubRsbuild({
    rsbuildConfig: {
      source: {
        entry: {
          index: path.join(__dirname, '../fixtures/a.js'),
        },
      },
      environments: {
        web: {},
        web1: {},
      },
      tools: {
        rspack(config: any, { appendPlugins, environment }: any) {
          if (environment.name === 'node') {
            appendPlugins(
              new RsdoctorRspackPlugin({
                disableClientServer: true,
                output: {
                  reportDir: path.join(__dirname, './doc_build/node/'),
                },
              }),
            );
          } else {
            appendPlugins(
              new RsdoctorRspackPlugin({
                disableClientServer: true,
              }),
            );
          }
        },
      },
    },
  });
  return res;
}

test('rsbuild environments tests', async () => {
  const rsdbuildInstance = await rsbuild();
  await rsdbuildInstance.build();
  const sdk = getSDK('web');
  expect(sdk.name).toBe('web');
  const sdk1 = getSDK('web1');
  expect(sdk1.name).toBe('web1');
});
