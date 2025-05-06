import test, { expect } from '@playwright/test';
import { Client } from '@rsdoctor/types';
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

// Function to replace paths in manifest.json
function replacePaths(
  manifestPath: fs.PathOrFileDescriptor,
  oldPath: string,
  newPath: string,
) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  const replaceInObject = (obj: { [x: string]: any }) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key].replace(oldPath, newPath);
      } else if (Array.isArray(obj[key])) {
        obj[key] = obj[key].map((item) =>
          typeof item === 'string' ? item.replace(oldPath, newPath) : item,
        );
      } else if (typeof obj[key] === 'object') {
        replaceInObject(obj[key]);
      }
    }
  };

  replaceInObject(manifest);

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
}

test.afterEach(async ({ page }) => {
  await page.close();
});

test('use Webpack stats.json', async () => {
  // Usage
  const manifestPath = path.resolve(
    __dirname,
    '../../fixtures/rsdoctor/manifest.json',
  );
  const oldPath = '<root>/rsdoctor';
  const newPath = path.resolve(__dirname, '../../../');

  replacePaths(manifestPath, oldPath, newPath);

  const { dispose, page } = await openBrowserByDiffCLI(
    getRsdoctorManifestPath(),
  );

  await page.evaluate(
    `window.location.hash = ${JSON.stringify(Client.RsdoctorClientRoutes.BundleDiff)}`,
  );

  replacePaths(manifestPath, newPath, oldPath);

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

  await dispose();
});
