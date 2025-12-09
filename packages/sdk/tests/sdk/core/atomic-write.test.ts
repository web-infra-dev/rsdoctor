import path from 'path';
import { tmpdir } from 'os';
import { describe, it, expect, afterEach, beforeAll } from '@rstest/core';
import { Worker } from 'node:worker_threads';
import { File } from '@rsdoctor/utils/build';
import { execSync } from 'node:child_process';

// Skip on Windows because rename may throw EPERM/EBUSY under concurrent access
const describeIfNotWin =
  process.platform === 'win32' ? describe.skip : describe;

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

    // Build SDK package before running tests to ensure dist exists
    beforeAll(() => {
      try {
        execSync('pnpm --filter @rsdoctor/sdk run build', {
          stdio: 'ignore',
          cwd: path.resolve(__dirname, '../../../../..'),
        });
      } catch {
        // Ignore build errors, dist may already exist
      }
    });

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
        const { parentPort, workerData } = require('node:worker_threads');
        const { File, Server } = require('@rsdoctor/utils/build');
        const { RsdoctorSDK } = require('@rsdoctor/sdk');

        (async () => {
          const { outputDir, readAttempts } = workerData;
          const port = await Server.getPort(4396);
          const sdk = new RsdoctorSDK({
            name: 'test',
            root: process.cwd(),
            port,
            config: { noServer: true },
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
            workerData: { outputDir, readAttempts },
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
