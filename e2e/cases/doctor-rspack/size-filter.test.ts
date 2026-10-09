import { expect, test } from '@test-kit/rstest';
import { compileByRspack } from '@scripts/test-helper';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRsdoctorPlugin } from './test-utils';

let fixture: string;
let reportUrl: string;

test.beforeAll(async () => {
  fixture = await mkdtemp(path.join(tmpdir(), 'rsdoctor-size-filter-'));
  await Promise.all([
    writeFile(path.join(fixture, 'package.json'), '{"type":"module"}'),
    writeFile(
      path.join(fixture, 'small.js'),
      "import data from './small-data.js'; window.small = data;",
    ),
    writeFile(
      path.join(fixture, 'large.js'),
      "import data from './large-data.js'; window.large = data;",
    ),
    writeFile(
      path.join(fixture, 'small-data.js'),
      `export default ${JSON.stringify('s'.repeat(2048))};`,
    ),
    writeFile(
      path.join(fixture, 'large-data.js'),
      `export default ${JSON.stringify('l'.repeat(2 * 1024 * 1024))};`,
    ),
  ]);
  const outputPath = path.join(fixture, 'dist');
  await compileByRspack(
    { small: './small.js', large: './large.js' },
    {
      context: fixture,
      devtool: 'source-map',
      output: { path: outputPath, filename: '[name].js' },
      optimization: { concatenateModules: false },
      plugins: [createRsdoctorPlugin({ output: { mode: 'brief' } })],
    },
  );
  reportUrl = `${pathToFileURL(path.join(outputPath, 'rsdoctor-report.html')).href}#/bundle/size`;
});

test.afterAll(async () => {
  if (fixture) await rm(fixture, { recursive: true, force: true });
});

for (const target of ['Asset Size', 'Module Size']) {
  for (const order of ['unit-first', 'value-first', 'pending-input']) {
    test(`${target} applies MB with ${order}`, async ({ page }) => {
      await page.goto(reportUrl);
      const control = page
        .locator('.ant-input-number-group-wrapper')
        .filter({ hasText: target });
      const assets = page
        .locator('.ant-card')
        .filter({ has: page.getByText('Output Assets List', { exact: true }) })
        .last();
      await assets.getByText('small.js', { exact: true }).click();
      const modules = page
        .locator('.ant-card')
        .filter({
          has: page.getByText('Modules of "small.js"', { exact: true }),
        })
        .last();
      const smallItem =
        target === 'Asset Size'
          ? assets.getByText('small.js', { exact: true })
          : modules.getByText('small-data.js', { exact: true });
      await expect(smallItem).toBeVisible();

      const setUnit = async (unit: string) => {
        await control.locator('.ant-select-selector').click();
        await page
          .locator('.ant-select-dropdown:visible')
          .getByTitle(unit, { exact: true })
          .click();
      };
      const input = control.getByRole('spinbutton');
      if (order === 'pending-input') {
        await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
        await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
      }

      if (order === 'unit-first') {
        await setUnit('MB');
        await input.fill('1');
      } else {
        await input.fill('1');
        if (order === 'value-first') {
          // Settle the existing 300 ms debounce before changing only the unit.
          await page.waitForTimeout(350);
          await expect(smallItem).toBeVisible();
        }
        await setUnit('MB');
      }

      if (order === 'pending-input') {
        await page.clock.runFor(350);
      }

      await expect(smallItem).toHaveCount(0);
      await expect(input).toHaveValue('1');
      if (target === 'Asset Size') {
        await expect(
          assets.getByText('large.js', { exact: true }),
        ).toBeVisible();
      }
      if (target === 'Module Size') {
        await assets.getByText('large.js', { exact: true }).click();
        const largeModules = page
          .locator('.ant-card')
          .filter({
            has: page.getByText('Modules of "large.js"', { exact: true }),
          })
          .last();
        await expect(
          largeModules.getByText('large-data.js', { exact: true }),
        ).toBeVisible();
        await assets.getByText('small.js', { exact: true }).click();
        await expect(smallItem).toHaveCount(0);
      }

      // Switching back reapplies the same visible value, without typing again.
      await setUnit('KB');
      await expect(smallItem).toBeVisible();
      if (target === 'Asset Size') {
        await expect(
          assets.getByText('large.js', { exact: true }),
        ).toBeVisible();
      }
    });
  }
}
