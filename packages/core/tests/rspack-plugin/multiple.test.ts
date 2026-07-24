import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, rs } from '@rstest/core';
import {
  rspack,
  type Configuration,
  type MultiCompiler,
  type MultiStats,
} from '@rspack/core';
import { RsdoctorRspackMultiplePlugin } from '@rsdoctor/core/rspack-plugin';

rs.setConfig({ testTimeout: 50000 });

function runCompiler(compiler: MultiCompiler): Promise<MultiStats> {
  return new Promise((resolve, reject) => {
    compiler.run((error, stats) => {
      if (error) {
        reject(error);
      } else if (stats) {
        resolve(stats);
      } else {
        reject(new Error('Rspack completed without stats.'));
      }
    });
  });
}

function closeCompiler(compiler: MultiCompiler): Promise<void> {
  return new Promise((resolve, reject) => {
    compiler.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

describe('RsdoctorRspackMultiplePlugin', () => {
  it('boots report servers during a MultiCompiler build', async () => {
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'rsdoctor-multi-compiler-'),
    );
    const originalCI = process.env.CI;
    const originalRSTEST = process.env.RSTEST;
    let compiler: MultiCompiler | undefined;

    process.env.CI = 'true';
    process.env.RSTEST = 'true';
    fs.writeFileSync(
      path.join(tempDir, 'index.js'),
      'export const answer = 42;\n',
    );

    const plugins = ['web', 'server'].map(
      (name, index) =>
        new RsdoctorRspackMultiplePlugin({
          name,
          stage: index,
          features: [],
          disableClientServer: false,
          output: {
            reportCodeType: 'noCode',
            reportDir: path.join(tempDir, `report-${name}`),
          },
          printLog: {
            serverUrls: false,
          },
        }),
    );

    for (const plugin of plugins) {
      plugin.sdk.server.openClientPage = async () => {};
    }

    const configs: Configuration[] = plugins.map((plugin, index) => ({
      name: index === 0 ? 'web' : 'server',
      mode: 'development',
      context: tempDir,
      entry: './index.js',
      output: {
        path: path.join(tempDir, `dist-${index}`),
        filename: 'main.js',
      },
      plugins: [plugin],
    }));

    try {
      compiler = rspack(configs);
      expect(compiler.compilers).toHaveLength(2);

      const stats = await runCompiler(compiler);

      expect(stats.hasErrors(), stats.toString()).toBe(false);
      expect(
        new Set(plugins.map((plugin) => plugin.sdk.server.origin)).size,
      ).toBe(2);
    } finally {
      if (compiler) {
        await closeCompiler(compiler);
      }
      await Promise.all(plugins.map((plugin) => plugin.sdk.dispose()));
      fs.rmSync(tempDir, { force: true, recursive: true });

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
