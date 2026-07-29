import path from 'path';
import { tmpdir } from 'os';
import { describe, it, expect, afterEach, beforeAll, rs } from '@rstest/core';
import { Worker } from 'node:worker_threads';
import { rspack } from '@rspack/core';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { File } from '@/build-utils';

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

describe('core package output', () => {
  it('should expose only the public runtime API', async () => {
    const core = await import(coreModuleUrl);

    expect(Object.keys(core).sort()).toEqual(
      [
        'Linter',
        'LinterRule',
        'LinterType',
        'RsdoctorRspackMultiplePlugin',
        'RsdoctorRspackPlugin',
        'RsdoctorSDK',
        'defineRule',
        'logger',
        'resolveClientDiffHtmlPath',
        'rules',
      ].sort(),
    );
  });

  it('should expose the proxy loader as a loadable file', async () => {
    const proxyLoader = await import(proxyLoaderModuleUrl);

    expect(proxyLoader.raw).toBe(true);
    expect(proxyLoader.default).toBeTypeOf('function');
  });

  it('should keep private loaders loadable from the bundled build', async () => {
    const { RsdoctorRspackPlugin } = await import(coreModuleUrl);
    const outputDir = path.join(
      tmpdir(),
      `rsdoctor-bundled-loader-${Date.now()}`,
    );
    const compiler = rspack({
      context: corePackageDir,
      entry: './tests/fixtures/default-export/literal/index.js',
      output: {
        path: outputDir,
      },
      plugins: [
        new RsdoctorRspackPlugin({
          disableClientServer: true,
          output: {
            reportDir: path.join(outputDir, 'report'),
          },
        }),
      ],
    });

    try {
      await new Promise<void>((resolve, reject) => {
        compiler.run((error, stats) => {
          if (error) {
            reject(error);
          } else if (stats?.hasErrors()) {
            reject(new Error(stats.toString({ errors: true })));
          } else {
            resolve();
          }
        });
      });
      const probeLoader = await import(probeLoaderModuleUrl);

      expect(probeLoader.default).toBeTypeOf('function');
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
      await File.fse.remove(outputDir);
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
          const { readFile } = await import('node:fs/promises');
          const { RsdoctorSDK } = await import(workerData.moduleUrl);
          const { outputDir, readAttempts } = workerData;
          const sdk = new RsdoctorSDK({
            name: 'test',
            root: process.cwd(),
            config: {
              noServer: true,
              server: {
                port: 10000 + Math.floor(Math.random() * 20000),
              },
            },
          });

          try {
            sdk.setOutputDir(outputDir);
            const manifestPath = await sdk.saveManifest(sdk.getStoreData(), {});

            for (let i = 0; i < readAttempts; i++) {
              const content = await readFile(manifestPath, 'utf-8');
              JSON.parse(content);
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
