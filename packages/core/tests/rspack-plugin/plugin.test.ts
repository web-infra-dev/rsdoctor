import { getSDK } from '@/inner-plugins/utils/sdk';
import { RsdoctorRspackPlugin } from '@/rspack-plugin';
import { RsdoctorPrimarySDK, RsdoctorSDK } from '@/sdk';
import { rspack } from '@rspack/core';
import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { RsdoctorServer } from '@/sdk/server';
import { File } from '@/build-utils';
import { tmpdir } from 'node:os';
import path from 'node:path';

rs.setConfig({ testTimeout: 30000 });

afterEach(async () => {
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

  it('emits independently matchable identities for multiple compilers', async () => {
    const testRoot = path.join(
      tmpdir(),
      `rsdoctor-multi-compiler-metadata-${Date.now()}`,
    );
    const reportDir = path.join(testRoot, 'report');
    const entry = path.resolve(
      __dirname,
      '../fixtures/default-export/literal/index.js',
    );
    const plugin = new RsdoctorRspackPlugin({
      disableClientServer: true,
      output: { reportDir },
    });
    const compiler = rspack([
      {
        context: path.resolve(__dirname, '../..'),
        entry,
        mode: 'development',
        name: 'web',
        output: { path: path.join(testRoot, 'web') },
        plugins: [plugin],
        target: 'web',
      },
      {
        context: path.resolve(__dirname, '../..'),
        entry,
        mode: 'development',
        name: 'node',
        output: { path: path.join(testRoot, 'node') },
        plugins: [plugin],
        target: 'node',
      },
    ]);

    try {
      const stats = await new Promise<
        NonNullable<Parameters<Parameters<typeof compiler.run>[0]>[1]>
      >((resolve, reject) => {
        compiler.run((error, result) => {
          if (error) {
            reject(error);
          } else if (!result) {
            reject(new Error('Rspack did not return compilation stats.'));
          } else if (result.hasErrors()) {
            reject(new Error(result.toString({ errors: true })));
          } else {
            resolve(result);
          }
        });
      });
      const observedHashes = Object.fromEntries(
        stats.stats.map((item) => [item.compilation.name, item.hash]),
      );
      const manifest = JSON.parse(
        await File.fse.readFile(
          path.join(reportDir, '.rsdoctor', 'manifest.json'),
          'utf-8',
        ),
      );
      const nodeManifestPath = manifest.series.find(
        (item: { name: string }) => item.name === 'node',
      ).path;
      const nodeManifest = JSON.parse(
        await File.fse.readFile(nodeManifestPath, 'utf-8'),
      );

      expect(manifest.metadata.build.compilationHash).toBeUndefined();
      expect(manifest.metadata.build.compilers).toEqual([
        expect.objectContaining({
          name: 'web',
          compilationHash: observedHashes.web,
          environment: 'web',
          target: 'web',
        }),
        expect.objectContaining({
          name: 'node',
          compilationHash: observedHashes.node,
          environment: 'node',
          target: 'node',
        }),
      ]);
      expect(nodeManifest.metadata.build.compilers).toEqual(
        manifest.metadata.build.compilers,
      );
    } finally {
      await new Promise<void>((resolve, reject) => {
        compiler.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
      await File.fse.remove(testRoot);
    }
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
