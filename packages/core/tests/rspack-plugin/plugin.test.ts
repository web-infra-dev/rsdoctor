import { getSDK } from '@/inner-plugins/utils/sdk';
import { RsdoctorRspackPlugin } from '@/rspack-plugin';
import { RsdoctorSDK } from '@/sdk';
import { rspack } from '@rspack/core';
import { afterEach, describe, expect, it } from '@rstest/core';
import { RsdoctorServer } from '@/sdk/server';

afterEach(() => {
  delete globalThis.__rsdoctor_sdk__;
  delete globalThis.__rsdoctor_sdks__;
});

describe('RsdoctorRspackPlugin', () => {
  it('registers SDKs by compiler name', async () => {
    const createPlugin = () =>
      new RsdoctorRspackPlugin({
        sdkInstance: new RsdoctorSDK({
          name: 'initial',
          root: process.cwd(),
          config: { noServer: true },
        }),
      });
    const webPlugin = createPlugin();
    const web1Plugin = createPlugin();

    rspack({ name: 'web', plugins: [webPlugin] });
    rspack({ name: 'web1', plugins: [web1Plugin] });
    await Promise.all([webPlugin._bootstrapTask, web1Plugin._bootstrapTask]);

    expect(webPlugin.sdk.name).toBe('web');
    expect(web1Plugin.sdk.name).toBe('web1');
    expect(getSDK('web')).toBe(webPlugin.sdk);
    expect(getSDK('web1')).toBe(web1Plugin.sdk);
  });

  it('keeps the report server when the client server is disabled in CI', () => {
    const originalCI = process.env.CI;
    const originalRSTEST = process.env.RSTEST;

    try {
      process.env.CI = 'true';
      delete process.env.RSTEST;

      const plugin = new RsdoctorRspackPlugin();

      expect(plugin.options.disableClientServer).toBe(true);
      expect(plugin.sdk.server).toBeInstanceOf(RsdoctorServer);
    } finally {
      if (typeof originalCI === 'undefined') {
        delete process.env.CI;
      } else {
        process.env.CI = originalCI;
      }

      if (typeof originalRSTEST === 'undefined') {
        delete process.env.RSTEST;
      } else {
        process.env.RSTEST = originalRSTEST;
      }
    }
  });
});
