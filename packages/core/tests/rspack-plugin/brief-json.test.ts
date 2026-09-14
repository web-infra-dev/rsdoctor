import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { rspack } from '@rspack/core';
import type { Manifest } from '@rsdoctor/shared/types';
import { RsdoctorRspackPlugin } from '@/rspack-plugin';
import { it, expect } from 'rstack/test';

it('writes discoverable and isolated JSON for a real multi-compiler build', async () => {
  const root = fs.mkdtempSync(path.join(tmpdir(), 'rsdoctor-rspack-json-'));
  const reportDir = path.join(root, 'report');
  const plugin = new RsdoctorRspackPlugin({
    disableClientServer: true,
    output: { reportDir, mode: 'brief', options: { type: ['json'] } },
  });
  const names = ['client', 'server'];
  for (const name of names) {
    fs.writeFileSync(path.join(root, `${name}.js`), `console.log('${name}');`);
  }
  const compiler = rspack(
    names.map((name) => ({
      name,
      mode: 'development',
      devtool: false,
      context: root,
      entry: `./${name}.js`,
      output: { path: path.join(root, 'assets', name) },
      plugins: [plugin],
    })),
  );

  try {
    await new Promise<void>((resolve, reject) => {
      compiler.run((error, stats) => {
        if (error) reject(error);
        else if (!stats || stats.hasErrors())
          reject(
            new Error(
              stats?.toString({ errors: true }) ?? 'Missing build stats',
            ),
          );
        else resolve();
      });
    });
    const entryFile = path.join(reportDir, 'rsdoctor-data.json');
    const report: Manifest.RsdoctorBriefData = JSON.parse(
      fs.readFileSync(entryFile, 'utf8'),
    );
    expect(report.series?.map((item) => item.name)).toEqual(names);
    for (const item of report.series!) {
      const filePath = path.resolve(reportDir, item.dataFile);
      const data: Manifest.RsdoctorBriefData = JSON.parse(
        fs.readFileSync(filePath, 'utf8'),
      );
      expect(data.name).toBe(item.name);
      expect(data.series).toHaveLength(2);
      const moduleNames = data.data.moduleGraph.modules.map((module) =>
        path.basename(module.path),
      );
      expect(moduleNames).toContain(`${item.name}.js`);
      expect(moduleNames).not.toContain(
        `${item.name === 'client' ? 'server' : 'client'}.js`,
      );
    }
  } finally {
    try {
      await new Promise<void>((resolve, reject) =>
        compiler.close((error) => (error ? reject(error) : resolve())),
      );
    } finally {
      delete globalThis.__rsdoctor_sdk__;
      delete globalThis.__rsdoctor_sdks__;
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});
