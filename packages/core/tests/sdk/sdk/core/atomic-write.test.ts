import path from 'path';
import { tmpdir } from 'os';
import { describe, it, expect, afterEach, beforeAll, rs } from '@rstest/core';
import { Worker } from 'node:worker_threads';
import { File } from '@rsdoctor/core';
import type { Plugin } from '@rsdoctor/shared/types';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const corePackageDir = path.resolve(__dirname, '../../../..');
const require = createRequire(import.meta.url);
const coreModuleUrl = pathToFileURL(
  path.resolve(corePackageDir, 'dist/index.js'),
).href;
const proxyLoaderModuleUrl = pathToFileURL(
  path.resolve(corePackageDir, 'dist/proxy-loader.js'),
).href;
const probeLoaderModuleUrl = pathToFileURL(
  path.resolve(corePackageDir, 'dist/probe-loader.js'),
).href;
const sharedGraphModuleUrl = pathToFileURL(
  require.resolve('@rsdoctor/shared/graph'),
).href;

rs.setConfig({ testTimeout: 30000 });

beforeAll(() => {
  execSync('pnpm --filter @rsdoctor/core run build', {
    stdio: 'ignore',
    cwd: corePackageDir,
  });
});

// Skip on Windows because rename may throw EPERM/EBUSY under concurrent access
const describeIfNotWin =
  process.platform === 'win32' ? describe.skip : describe;

describe('core package exports', () => {
  it('should expose the proxy loader as a loadable file', async () => {
    const [{ InternalLoaderPlugin }, proxyLoader] = await Promise.all([
      import(coreModuleUrl),
      import(proxyLoaderModuleUrl),
    ]);
    const plugin = new InternalLoaderPlugin({});

    expect(plugin.internalLoaderPath).toBe(fileURLToPath(proxyLoaderModuleUrl));
    expect(proxyLoader.raw).toBe(true);
    expect(proxyLoader.default).toBeTypeOf('function');
  });

  it('should keep the private probe loader loadable from the bundled build', async () => {
    const doctorTest = process.env.DOCTOR_TEST;
    delete process.env.DOCTOR_TEST;

    try {
      const [{ Utils }, probeLoader] = await Promise.all([
        import(coreModuleUrl),
        import(probeLoaderModuleUrl),
      ]);
      const [rule] = Utils.addProbeLoader2Rules(
        [{ loader: 'mock-loader' }],
        { options: { name: 'test-compiler' } } as Plugin.BaseCompiler,
        () => true,
      );
      const loaders = rule.use as Array<{ loader: string }>;
      const probeLoaderPath = fileURLToPath(probeLoaderModuleUrl);

      expect(loaders[0].loader).toBe(probeLoaderPath);
      expect(loaders[2].loader).toBe(probeLoaderPath);
      expect(probeLoader.default).toBeTypeOf('function');
    } finally {
      if (doctorTest === undefined) {
        delete process.env.DOCTOR_TEST;
      } else {
        process.env.DOCTOR_TEST = doctorTest;
      }
    }
  });

  it('should keep openBrowser static assets reachable from output chunks', async () => {
    const distDir = path.resolve(corePackageDir, 'dist');
    const outputFiles = (await File.fse.readdir(distDir))
      .filter((file) => file.endsWith('.js'))
      .map((file) => path.join(distDir, file));
    const openBrowserChunks: string[] = [];

    for (const outputFile of outputFiles) {
      const source = await File.fse.readFile(outputFile, 'utf8');
      if (source.includes('openChrome.applescript')) {
        openBrowserChunks.push(outputFile);
      }
    }

    expect(openBrowserChunks.length).toBeGreaterThan(0);
    for (const outputFile of openBrowserChunks) {
      expect(
        await File.fse.pathExists(
          path.resolve(
            path.dirname(outputFile),
            '../static/openChrome.applescript',
          ),
        ),
      ).toBe(true);
    }
  });

  it('should reuse public shared graph constructors', async () => {
    const [{ RsdoctorSDK }, { ModuleGraph }] = await Promise.all([
      import(coreModuleUrl),
      import(sharedGraphModuleUrl),
    ]);
    const moduleGraph = new ModuleGraph();
    const sdk = new RsdoctorSDK({
      name: 'test',
      root: process.cwd(),
      config: { noServer: true },
    });

    moduleGraph.addLayer('browser');
    sdk.reportModuleGraph(moduleGraph);

    expect(sdk.getStoreData().moduleGraph.layers).toEqual(['browser']);
  });
});

/**
 * Verify manifest writing uses an atomic pattern (temp file + rename).
 * Atomic write prevents file truncation caused by O_TRUNC during concurrent writes.
 *
 * Scenario:
 * - Multiple SDK instances write the same manifest.json concurrently
 * - outputFile truncates first (O_TRUNC), then writes content
 * - Readers may observe partial JSON during the write window
 *
 * Solution:
 * - Write to a temp file, then rename to replace atomically
 * - Readers either see the old file or the new file, never a partial file
 */
describe('atomic write manifest', () => {
  describeIfNotWin('concurrent write test', () => {
    let outputDir: string;

    afterEach(async () => {
      if (outputDir) {
        await File.fse.remove(outputDir);
      }
    });

    it('should handle concurrent writes without JSON parsing errors', async () => {
      outputDir = path.join(tmpdir(), `rsdoctor-atomic-${Date.now()}`);
      const numWorkers = 10;
      const readAttempts = 100;

      const workerScript = `
        (async () => {
          const { parentPort, workerData } = await import('node:worker_threads');
          const { File, Server, RsdoctorSDK } = await import(workerData.moduleUrl);
          const { outputDir, readAttempts } = workerData;
          const port = await Server.getPort(
            10000 + Math.floor(Math.random() * 20000),
          );
          const sdk = new RsdoctorSDK({
            name: 'test',
            root: process.cwd(),
            config: {
              noServer: true,
              server: {
                port,
              },
            },
          });

          try {
            sdk.setOutputDir(outputDir);
            const manifestPath = await sdk.saveManifest(sdk.getStoreData(), {});

            for (let i = 0; i < readAttempts; i++) {
              if (await File.fse.pathExists(manifestPath)) {
                const content = await File.fse.readFile(manifestPath, 'utf-8');
                JSON.parse(content);
              }
            }

            parentPort?.postMessage({ ok: true });
          } catch (error) {
            parentPort?.postMessage({
              error: error instanceof Error ? error.message : String(error),
            });
          } finally {
            await sdk.dispose();
          }
        })();
      `;

      const workers: Worker[] = [];
      const terminateAll = () => workers.forEach((w) => w.terminate());

      const runWorker = () =>
        new Promise<void>((resolve, reject) => {
          const worker = new Worker(workerScript, {
            eval: true,
            execArgv: [],
            workerData: {
              outputDir,
              readAttempts,
              moduleUrl: coreModuleUrl,
            },
          });
          workers.push(worker);

          let settled = false;
          const fail = (err: Error) => {
            if (settled) return;
            settled = true;
            terminateAll();
            reject(err);
          };

          worker.on('message', (msg) => {
            if (settled) return;
            if (msg?.error) {
              fail(new Error(msg.error));
            } else {
              settled = true;
              resolve();
            }
          });
          worker.on('error', fail);
          worker.on('exit', (code) => {
            if (settled) return;
            if (code !== 0) {
              fail(new Error('Worker stopped with exit code ' + code));
            } else {
              settled = true;
              resolve();
            }
          });
        });

      await Promise.all(Array.from({ length: numWorkers }, () => runWorker()));
    });
  });
});
