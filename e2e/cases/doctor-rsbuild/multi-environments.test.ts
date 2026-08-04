import { expect, test } from '@playwright/test';
import { RsdoctorRspackPlugin } from '@rsdoctor/core';
import type { Linter } from '@rsdoctor/shared/types';
import { createStubRsbuild } from '@scripts/test-helper';
import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('automatically exports isolated reports for Rsbuild environments', async () => {
  const testRoot = path.join(
    tmpdir(),
    `rsdoctor-rsbuild-environments-${Date.now()}`,
  );
  const reportDir = path.join(testRoot, 'reports');
  const entry = path.resolve(__dirname, 'fixtures/multi-entry.js');
  const plugins: RsdoctorRspackPlugin<Linter.ExtendRuleData[]>[] = [];

  try {
    const rsbuild = await createStubRsbuild({
      cwd: testRoot,
      rsbuildConfig: {
        environments: {
          web: {
            source: { entry: { index: entry } },
            output: { target: 'web' },
          },
          node: {
            source: { entry: { index: entry } },
            output: { target: 'node' },
          },
        },
        tools: {
          rspack(_config, { appendPlugins }) {
            const plugin = new RsdoctorRspackPlugin({
              disableClientServer: true,
              output: { reportDir },
            });
            plugins.push(plugin);
            appendPlugins(plugin);
          },
        },
      },
    });

    await rsbuild.build();

    expect(plugins).toHaveLength(2);
    expect(plugins.map((plugin) => plugin.sdk.name)).toEqual(['web', 'node']);

    const primaryManifestPath = path.join(
      reportDir,
      '.rsdoctor',
      'manifest.json',
    );
    const nodeManifestPath = path.join(
      reportDir,
      '.rsdoctor',
      'compilers',
      'node',
      'manifest.json',
    );
    const primaryManifest = JSON.parse(
      await readFile(primaryManifestPath, 'utf-8'),
    );
    const nodeManifest = JSON.parse(await readFile(nodeManifestPath, 'utf-8'));

    expect(primaryManifest.name).toBe('web');
    expect(nodeManifest.name).toBe('node');
    expect(
      primaryManifest.series.map(({ name }: { name: string }) => name),
    ).toEqual(['web', 'node']);
    expect(nodeManifest.series).toEqual(primaryManifest.series);
  } finally {
    await rm(testRoot, { recursive: true, force: true });
  }
});

test('embeds compiler navigation in brief reports', async () => {
  const testRoot = path.join(
    tmpdir(),
    `rsdoctor-rsbuild-brief-environments-${Date.now()}`,
  );
  const reportDir = path.join(testRoot, 'reports');
  const entry = path.resolve(__dirname, 'fixtures/multi-entry.js');

  try {
    const rsbuild = await createStubRsbuild({
      cwd: testRoot,
      rsbuildConfig: {
        environments: {
          web: {
            source: { entry: { index: entry } },
            output: { target: 'web' },
          },
          node: {
            source: { entry: { index: entry } },
            output: { target: 'node' },
          },
        },
        tools: {
          rspack(_config, { appendPlugins }) {
            appendPlugins(
              new RsdoctorRspackPlugin({
                disableClientServer: true,
                output: {
                  mode: 'brief',
                  reportDir,
                  options: { type: ['html'] },
                },
              }),
            );
          },
        },
      },
    });

    await rsbuild.build();

    const webReport = await readFile(
      path.join(reportDir, 'rsdoctor-report.html'),
      'utf-8',
    );
    const nodeReport = await readFile(
      path.join(reportDir, 'compilers', 'node', 'rsdoctor-report.html'),
      'utf-8',
    );

    expect(webReport).toContain('.name="web"');
    expect(webReport).toContain('compilers/node/rsdoctor-report.html');
    expect(nodeReport).toContain('.name="node"');
  } finally {
    await rm(testRoot, { recursive: true, force: true });
  }
});
