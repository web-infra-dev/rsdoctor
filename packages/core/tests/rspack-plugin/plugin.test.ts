import { getSDK } from '@/inner-plugins/utils/sdk';
import { RsdoctorRspackPlugin } from '@/rspack-plugin';
import { RsdoctorPrimarySDK, RsdoctorSDK } from '@/sdk';
import { File } from '@/build-utils';
import { RsdoctorServer } from '@/sdk/server';
import { rspack, type MultiCompiler, type MultiStats } from '@rspack/core';
import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { tmpdir } from 'node:os';
import path from 'node:path';

rs.setConfig({ testTimeout: 30000 });

const createMultiCompiler = (
  testRoot: string,
  plugin: RsdoctorRspackPlugin,
) => {
  const context = path.resolve(__dirname, '../..');
  const entry = path.resolve(
    __dirname,
    '../fixtures/default-export/literal/index.js',
  );

  return rspack([
    {
      context,
      entry,
      mode: 'development',
      name: 'web',
      output: { path: path.join(testRoot, 'web') },
      plugins: [plugin],
      target: 'web',
    },
    {
      context,
      entry,
      mode: 'development',
      name: 'node',
      output: { path: path.join(testRoot, 'node') },
      plugins: [plugin],
      target: 'node',
    },
  ]);
};

const runCompiler = (compiler: MultiCompiler) =>
  new Promise<MultiStats>((resolve, reject) => {
    compiler.run((error, stats) => {
      if (error) {
        reject(error);
        return;
      }
      if (!stats) {
        reject(new Error('Rspack did not return compilation stats.'));
        return;
      }
      if (stats.hasErrors()) {
        reject(new Error(stats.toString({ errors: true })));
        return;
      }
      resolve(stats);
    });
  });

const closeCompiler = (compiler: MultiCompiler) =>
  new Promise<void>((resolve, reject) => {
    compiler.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

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

  it('emits independently matchable identities for multiple compilers', async () => {
    const testRoot = path.join(
      tmpdir(),
      `rsdoctor-multi-compiler-metadata-${Date.now()}`,
    );
    const reportDir = path.join(testRoot, 'report');
    const plugin = new RsdoctorRspackPlugin({
      disableClientServer: true,
      output: { reportDir },
    });
    const compiler = createMultiCompiler(testRoot, plugin);

    try {
      const stats = await runCompiler(compiler);
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
      await closeCompiler(compiler);
      await File.fse.remove(testRoot);
    }
  });

  it('refreshes brief JSON identities after sibling and watch completions', async () => {
    const testRoot = path.join(
      tmpdir(),
      `rsdoctor-multi-compiler-brief-metadata-${Date.now()}`,
    );
    const reportDir = path.join(testRoot, 'report');
    const plugin = new RsdoctorRspackPlugin({
      disableClientServer: true,
      features: { resolver: true },
      output: {
        reportDir,
        mode: 'brief',
        options: { type: ['json'] },
      },
    });
    const compiler = createMultiCompiler(testRoot, plugin);

    try {
      const stats = await runCompiler(compiler);
      const observedHashes = Object.fromEntries(
        stats.stats.map((item) => [item.compilation.name, item.hash]),
      );
      const webSDK = plugin.getCompilerSDK('web') as RsdoctorPrimarySDK;
      const nodeSDK = plugin.getCompilerSDK('node') as RsdoctorPrimarySDK;
      const readArtifact = async (sdk: RsdoctorPrimarySDK) =>
        JSON.parse(
          await File.fse.readFile(
            path.join(sdk.outputDir, 'rsdoctor-data.json'),
            'utf-8',
          ),
        );
      const expectedCompilers = [
        expect.objectContaining({
          name: 'web',
          compilationHash: observedHashes.web,
        }),
        expect.objectContaining({
          name: 'node',
          compilationHash: observedHashes.node,
        }),
      ];

      expect((await readArtifact(webSDK)).metadata.build.compilers).toEqual(
        expectedCompilers,
      );
      expect((await readArtifact(nodeSDK)).metadata.build.compilers).toEqual(
        expectedCompilers,
      );
      expect((await readArtifact(webSDK)).metadata.sections.resolver).toEqual({
        status: 'collected',
      });
      expect((await readArtifact(webSDK)).metadata.sections.loader).toEqual({
        status: 'collected',
      });

      webSDK.setArtifactBuildIdentity({
        compilationHash: 'web-watch-hash',
        environment: 'web',
        target: 'web',
      });
      await webSDK.writeStore();

      expect(
        (await readArtifact(nodeSDK)).metadata.build.compilers,
      ).toContainEqual(
        expect.objectContaining({
          name: 'web',
          compilationHash: 'web-watch-hash',
        }),
      );
    } finally {
      await closeCompiler(compiler);
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

  it('opens the dashboard automatically only once across rebuilds', async () => {
    const sdk = new RsdoctorSDK({
      name: 'watch',
      root: process.cwd(),
      config: { noServer: true },
    });
    const plugin = new RsdoctorRspackPlugin({ sdkInstance: sdk });
    const compiler = rspack({ name: 'watch', plugins: [plugin] });
    const openClientPage = rs
      .spyOn(sdk.server, 'openClientPage')
      .mockResolvedValue();
    const writeStore = rs.spyOn(sdk, 'writeStore').mockResolvedValue('');

    await plugin.done(compiler);
    await plugin.done(compiler);

    expect(writeStore).toHaveBeenCalledTimes(2);
    expect(openClientPage).toHaveBeenCalledTimes(1);

    await sdk.server.openClientPage('homepage');

    expect(openClientPage).toHaveBeenCalledTimes(2);

    await sdk.dispose();
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
