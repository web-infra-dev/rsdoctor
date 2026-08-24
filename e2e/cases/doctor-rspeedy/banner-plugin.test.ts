import { expect, test } from '@test-kit/rstest';
import { RsdoctorRspackPlugin } from '@rsdoctor/core';
import path from 'path';
import { createStubRspeedy } from './rspeedy';

test('rspack plugin intercept', async () => {
  const originalEnvRSDOCTOR = process.env.RSDOCTOR;
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
  try {
    process.env.RSDOCTOR = 'true';
    await rspeedy.build();

    const datas = plugin.sdk.getStoreData();
    expect(datas.moduleGraph.modules.length).toBeGreaterThan(70);
  } finally {
    process.env.RSDOCTOR = originalEnvRSDOCTOR;
  }
});
