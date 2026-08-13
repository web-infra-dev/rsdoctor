import { getSDK } from '@/inner-plugins/utils/sdk';
import { RsdoctorRspackPlugin } from '@/rspack-plugin';
import { RsdoctorPrimarySDK, RsdoctorSDK } from '@/sdk';
import { RsdoctorServer } from '@/sdk/server';
import { rspack } from '@rspack/core';
import { afterEach, describe, expect, it, rs } from '@rstest/core';
import path from 'node:path';

afterEach(async () => {
  rs.restoreAllMocks();
  delete globalThis.__rsdoctor_sdk__;
  delete globalThis.__rsdoctor_sdks__;
  await new Promise((resolve) => setTimeout(resolve, 0));
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

  it('automatically groups plugin instances created for multiple compilers', async () => {
    const webPlugin = new RsdoctorRspackPlugin({
      disableClientServer: true,
    });
    const nodePlugin = new RsdoctorRspackPlugin({
      disableClientServer: true,
    });

    rspack({ name: 'web', plugins: [webPlugin] });
    rspack({ name: 'node', plugins: [nodePlugin] });
    await Promise.all([webPlugin._bootstrapTask, nodePlugin._bootstrapTask]);

    const webSDK = webPlugin.sdk as RsdoctorPrimarySDK;
    const nodeSDK = nodePlugin.sdk as RsdoctorPrimarySDK;
    expect(webSDK.parent).toBe(nodeSDK.parent);
    expect(webSDK.parent.getSeriesData().map((item) => item.name)).toEqual([
      'web',
      'node',
    ]);
    expect(getSDK('web')).toBe(webSDK);
    expect(getSDK('node')).toBe(nodeSDK);

    await Promise.all([webSDK.dispose(), nodeSDK.dispose()]);
  });

  it('uses the configured output path before the compiler starts', async () => {
    const reportDir = path.join(process.cwd(), 'dist', 'brief-report');
    const plugin = new RsdoctorRspackPlugin({
      disableClientServer: true,
      output: { mode: 'brief' },
    });

    rspack({
      output: { path: reportDir },
      plugins: [plugin],
    });
    await plugin._bootstrapTask;

    expect(plugin.sdk.outputDir).toBe(reportDir);

    await plugin.sdk.dispose();
  });

  it('creates isolated compiler contexts when one plugin instance is reused', async () => {
    const plugin = new RsdoctorRspackPlugin({
      disableClientServer: true,
    });

    rspack([
      { name: 'web', plugins: [plugin] },
      { name: 'node', plugins: [plugin] },
    ]);
    await plugin._bootstrapTask;

    const primarySDK = plugin.sdk as RsdoctorPrimarySDK;
    expect(primarySDK.parent.getSeriesData().map((item) => item.name)).toEqual([
      'web',
      'node',
    ]);
    expect(getSDK('web')).toBe(primarySDK);
    expect(getSDK('node')).not.toBe(primarySDK);
    expect(plugin.getCompilerSDK('node')).toBe(getSDK('node'));

    await Promise.all(primarySDK.parent.slaves.map((sdk) => sdk.dispose()));
  });

  it('can disable aggregation for unrelated compiler instances', async () => {
    const firstPlugin = new RsdoctorRspackPlugin({
      disableClientServer: true,
      multiCompiler: false,
      server: { port: 19120 },
    });
    const secondPlugin = new RsdoctorRspackPlugin({
      disableClientServer: true,
      multiCompiler: false,
      server: { port: 19121 },
    });

    rspack({ name: 'first', plugins: [firstPlugin] });
    rspack({ name: 'second', plugins: [secondPlugin] });
    await Promise.all([
      firstPlugin._bootstrapTask,
      secondPlugin._bootstrapTask,
    ]);

    const firstSDK = firstPlugin.sdk as RsdoctorPrimarySDK;
    const secondSDK = secondPlugin.sdk as RsdoctorPrimarySDK;
    expect(firstSDK.parent).not.toBe(secondSDK.parent);
    expect(firstSDK.getManifestData().series).toBeUndefined();
    expect(secondSDK.getManifestData().series).toBeUndefined();

    await Promise.all([firstSDK.dispose(), secondSDK.dispose()]);
  });

  it('bootstraps the SDK only once across apply and done', async () => {
    const sdk = new RsdoctorSDK({
      name: 'bootstrap-once',
      root: process.cwd(),
      config: { noServer: true },
    });
    let resolveBootstrap!: () => void;
    const bootstrapTask = new Promise<void>((resolve) => {
      resolveBootstrap = resolve;
    });
    const bootstrap = rs.spyOn(sdk, 'bootstrap').mockReturnValue(bootstrapTask);
    const writeStore = rs.spyOn(sdk, 'writeStore').mockResolvedValue('');

    const plugin = new RsdoctorRspackPlugin({
      disableClientServer: true,
      features: [],
      sdkInstance: sdk,
    });
    const compiler = rspack({ plugins: [plugin] });

    const doneTask = plugin.done(compiler);
    await Promise.resolve();

    expect(bootstrap).toHaveBeenCalledTimes(1);
    expect(writeStore).not.toHaveBeenCalled();

    resolveBootstrap();
    await doneTask;

    expect(writeStore).toHaveBeenCalledTimes(1);
  });

  it('restarts the SDK once after done disposes it', async () => {
    const originalRSTEST = process.env.RSTEST;
    delete process.env.RSTEST;

    try {
      const sdk = new RsdoctorSDK({
        name: 'bootstrap-after-dispose',
        root: process.cwd(),
        config: { noServer: true },
      });
      const bootstrap = rs.spyOn(sdk, 'bootstrap').mockResolvedValue();
      const dispose = rs.spyOn(sdk, 'dispose').mockResolvedValue();
      rs.spyOn(sdk, 'writeStore').mockResolvedValue('');

      const plugin = new RsdoctorRspackPlugin({
        disableClientServer: true,
        features: [],
        sdkInstance: sdk,
      });
      const compiler = rspack({ plugins: [plugin] });

      await plugin.done(compiler);
      await plugin.done(compiler);

      expect(bootstrap).toHaveBeenCalledTimes(2);
      expect(dispose).toHaveBeenCalledTimes(2);
    } finally {
      if (typeof originalRSTEST === 'undefined') {
        delete process.env.RSTEST;
      } else {
        process.env.RSTEST = originalRSTEST;
      }
    }
  });

  it('retries bootstrap on the next build after a failure', async () => {
    const sdk = new RsdoctorSDK({
      name: 'bootstrap-error',
      root: process.cwd(),
      config: { noServer: true },
    });
    const error = new Error('bootstrap failed');
    const bootstrap = rs
      .spyOn(sdk, 'bootstrap')
      .mockRejectedValueOnce(error)
      .mockResolvedValue();
    const writeStore = rs.spyOn(sdk, 'writeStore').mockResolvedValue('');

    const plugin = new RsdoctorRspackPlugin({
      features: [],
      sdkInstance: sdk,
    });
    const compiler = rspack({ plugins: [plugin] });

    await expect(plugin.done(compiler)).rejects.toBe(error);
    await plugin.done(compiler);

    expect(bootstrap).toHaveBeenCalledTimes(2);
    expect(writeStore).toHaveBeenCalledTimes(1);
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
