import { expect, test } from '@playwright/test';
import { RsdoctorRspackPlugin } from '@rsdoctor/core';
import path from 'path';
import { createStubRspeedy } from './rspeedy';

test.afterEach(async ({ page }) => {
  await page.close();
});

test('rspack plugin intercept', async () => {
  const plugin = new RsdoctorRspackPlugin({
    disableClientServer: true,
  });
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
        appendPlugins(plugin);
        return config;
      },
    },
  });
  process.env.RSDOCTOR = 'true';
  await rspeedy.build();

  const datas = plugin.sdk.getStoreData();
  expect(datas.moduleGraph.modules.length).toBeGreaterThan(70);
});
