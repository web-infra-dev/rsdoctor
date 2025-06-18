import { expect, test } from '@playwright/test';
import { getSDK } from '@rsdoctor/core/plugins';
import path from 'path';
import { createStubRspeedy } from './rspeedy';
import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin';

test.afterEach(async ({ page }) => {
  await page.close();
});

test('rspack plugin intercept', async () => {
  const rspeedy = await createStubRspeedy({
    source: {
      entry: { main: path.join(__dirname, './fixtures/index.tsx') },
    },
    tools: {
      rspack(config: any, { appendPlugins }: any) {
        config.optimization = {
          ...config.optimization,
          concatenateModules: false,
        };
        appendPlugins(
          new RsdoctorRspackPlugin({
            disableClientServer: true,
            supports: {
              banner: true,
            },
          }),
        );
        return config;
      },
    },
  });
  process.env.RSDOCTOR = 'true';
  await rspeedy.build();

  const sdk = getSDK();
  const datas = sdk.getStoreData();
  expect(datas.moduleGraph.modules.length).toBeGreaterThan(70);
});
