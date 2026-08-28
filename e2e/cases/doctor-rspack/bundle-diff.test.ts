import { expect, test } from '@test-kit/rstest';
import { Client } from '@rsdoctor/shared/types';
import {
  getRsdoctorManifestPath,
  openBrowserByDiffCLI,
} from '../../test-kit/index';
import fs from 'node:fs';
import path from 'node:path';

// @ts-ignore
process.stderr.clearLine = () => {};
// @ts-ignore
process.stderr.cursorTo = () => {};
// @ts-ignore
process.stderr.moveCursor = () => {};

function serializeManifestWithReplacedPaths(
  manifest: string,
  oldPath: string,
  newPath: string,
) {
  return JSON.stringify(
    JSON.parse(manifest),
    (_key, value) =>
      typeof value === 'string' ? value.replaceAll(oldPath, newPath) : value,
    2,
  );
}

test('escapes Windows paths in manifest JSON', () => {
  const oldPath = '<root>/rsdoctor';
  const newPath = String.raw`C:\workspace\rsdoctor`;
  const manifest = JSON.stringify({
    root: oldPath,
    files: [`${oldPath}/index.js`],
  });

  const updatedManifest = serializeManifestWithReplacedPaths(
    manifest,
    oldPath,
    newPath,
  );

  expect(JSON.parse(updatedManifest)).toEqual({
    root: newPath,
    files: [`${newPath}/index.js`],
  });
});

test('use Rsdoctor manifest data', async ({ page }) => {
  // Usage
  const manifestPath = path.resolve(
    __dirname,
    '../../fixtures/rsdoctor/manifest.json',
  );
  const oldPath = '<root>/rsdoctor';
  const newPath = path.resolve(__dirname, '../../../');
  const originalManifest = fs.readFileSync(manifestPath, 'utf-8');

  fs.writeFileSync(
    manifestPath,
    serializeManifestWithReplacedPaths(originalManifest, oldPath, newPath),
    'utf-8',
  );

  let dispose: (() => Promise<void>) | undefined;

  try {
    ({ dispose } = await openBrowserByDiffCLI(page, getRsdoctorManifestPath()));

    await page.evaluate(
      `window.location.hash = ${JSON.stringify(Client.RsdoctorClientRoutes.BundleDiff)}`,
    );

    // card for bundle diff.
    await page.waitForSelector('.statistic-card', { timeout: 20000 });
    const tabs = await page.$$(`#root .ant-tabs-tab`);

    expect(tabs.length).toBeGreaterThan(0);

    const tabTexts = await Promise.all(
      tabs.map((tab) => page.evaluate((node) => node.textContent, tab)),
    );

    expect(tabTexts).toContain('Overview');
    expect(tabTexts).toContain('Assets');
    expect(tabTexts).toContain('Modules');
    expect(tabTexts).toContain('Packages');
  } finally {
    fs.writeFileSync(manifestPath, originalManifest, 'utf-8');
    await dispose?.();
  }
});
