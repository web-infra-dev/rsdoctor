import { expect, test } from '@test-kit/rstest';
import { compileByRspack } from '@scripts/test-helper';
import { SourceMapDevToolPlugin } from '@rspack/core';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Locator, Page } from 'playwright';
import { createRsdoctorPlugin } from './test-utils';

let fixture: string;
let reportUrl: string;
let navigableModuleName: string;

test.beforeAll(async () => {
  fixture = await mkdtemp(path.join(tmpdir(), 'rsdoctor-module-sort-'));
  const files: Record<string, string> = {
    'alpha/alpha-small.js': `export default ${JSON.stringify('a'.repeat(1800))};`,
    'alpha/alpha-large.js': `export default ${JSON.stringify('b'.repeat(2400))};`,
    'beta/beta-small.js': `export default ${JSON.stringify('c'.repeat(200))};`,
    'beta/beta-large.js': `export default ${JSON.stringify('d'.repeat(3300))};`,
    // Minification removes this comment, so source and bundled sizes disagree.
    'metrics/a-source.js': `/* ${'comment'.repeat(3000)} */\nexport default 'small';`,
    'metrics/z-bundled.js': `export default ${JSON.stringify('e'.repeat(5000))};`,
  };
  // Keep more than 20 modules so defaultExpandAll cannot hide expansion resets.
  for (let i = 0; i < 20; i++) {
    files[`filler/item-${i}.js`] = `export default ${i};`;
  }
  await Promise.all(
    Object.entries(files).map(async ([name, content]) => {
      await mkdir(path.dirname(path.join(fixture, name)), { recursive: true });
      await writeFile(path.join(fixture, name), content);
    }),
  );
  await writeFile(path.join(fixture, 'package.json'), '{"type":"module"}');
  await writeFile(
    path.join(fixture, 'main.js'),
    Object.keys(files)
      .map((name, i) => `import value${i} from './${name}';`)
      .join('\n') +
      `\nwindow.values = [${Object.keys(files)
        .map((_, i) => `value${i}`)
        .join(',')}];`,
  );
  const outputPath = path.join(fixture, 'dist');
  const doctor = createRsdoctorPlugin({ output: { mode: 'brief' } });
  await compileByRspack('./main.js', {
    context: fixture,
    devtool: false,
    output: { path: outputPath, filename: 'main.js' },
    optimization: { concatenateModules: false, minimize: true },
    plugins: [
      doctor,
      new SourceMapDevToolPlugin({
        filename: '[file].map',
        // Match native module paths on Windows as well as POSIX.
        moduleFilenameTemplate: (info) =>
          path.normalize(info.absoluteResourcePath),
      }),
    ],
  });

  const modules = doctor.sdk.getStoreData().moduleGraph.modules;
  // The existing module drawer treats id 0 as no selection.
  const navigableModule = modules.find(
    (mod) => /[\\/]metrics[\\/]/.test(mod.path) && mod.id > 0,
  );
  expect(navigableModule).toBeDefined();
  navigableModuleName = path.basename(navigableModule!.path);
  const size = (name: string) =>
    modules.find((mod) => mod.path.replace(/\\/g, '/').endsWith(`/${name}`))!
      .size;
  expect(modules.length).toBeGreaterThan(20);
  expect(
    size('alpha/alpha-small.js').parsedSize +
      size('alpha/alpha-large.js').parsedSize,
  ).toBeGreaterThan(
    size('beta/beta-small.js').parsedSize +
      size('beta/beta-large.js').parsedSize,
  );
  expect(size('alpha/alpha-large.js').parsedSize).toBeLessThan(
    size('beta/beta-large.js').parsedSize,
  );
  expect(size('metrics/a-source.js').sourceSize).toBeGreaterThan(
    size('metrics/z-bundled.js').sourceSize,
  );
  expect(size('metrics/a-source.js').parsedSize).toBeLessThan(
    size('metrics/z-bundled.js').parsedSize,
  );
  reportUrl = `${pathToFileURL(path.join(outputPath, 'rsdoctor-report.html')).href}#/bundle/size`;
});

test.afterAll(async () => {
  if (fixture) await rm(fixture, { recursive: true, force: true });
});

async function openModules(page: Page) {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.goto(reportUrl);
  const modules = page
    .locator('.ant-card')
    .filter({ has: page.getByText('Modules of "main.js"', { exact: true }) })
    .last();
  await expect(modules.getByText('alpha', { exact: true })).toBeVisible();
  return modules;
}

async function sortModules(page: Page, modules: Locator, label: string) {
  const select = modules.getByRole('combobox', { name: 'Sort modules' });
  await expect(select).toBeVisible();
  await modules.locator('.ant-select-selector').click();
  await page
    .locator('.ant-select-dropdown:visible')
    .getByTitle(label, { exact: true })
    .click();
}

async function expectOrder(modules: Locator, names: string[]) {
  await expect
    .poll(async () => {
      const titles = await modules
        .locator('.ant-tree-title span[class*="bundleTreeEntryTitle"]')
        .allTextContents();
      return titles.filter((title) => names.includes(title));
    })
    .toEqual(names);
}

test('sorts directory totals and nested files without resetting expansion', async ({
  page,
}) => {
  const modules = await openModules(page);
  await modules.getByText('alpha', { exact: true }).click();
  await expect(
    modules.getByText('alpha-small.js', { exact: true }),
  ).toBeVisible();
  await expect(modules.getByText('beta-large.js', { exact: true })).toHaveCount(
    0,
  );
  const originalOrder = await modules
    .locator('.ant-tree-title')
    .allTextContents();

  await sortModules(page, modules, 'Bundled size ↓');
  // Alpha wins by its total even though beta contains the largest single file.
  await expectOrder(modules, ['alpha', 'beta']);
  await expectOrder(modules, ['alpha-large.js', 'alpha-small.js']);
  await expect(modules.getByText('beta-large.js', { exact: true })).toHaveCount(
    0,
  );

  await sortModules(page, modules, 'Original order');
  await expect(modules.locator('.ant-tree-title')).toHaveText(originalOrder);
});

test('uses the selected size metric and keeps module navigation working', async ({
  page,
}) => {
  const modules = await openModules(page);
  await modules.getByText('metrics', { exact: true }).click();
  await sortModules(page, modules, 'Bundled size ↓');
  await expectOrder(modules, ['z-bundled.js', 'a-source.js']);
  await sortModules(page, modules, 'Source size ↓');
  await expectOrder(modules, ['a-source.js', 'z-bundled.js']);

  await modules.getByText(navigableModuleName, { exact: true }).click();
  const drawer = page.locator('.ant-drawer:visible');
  await expect(drawer.locator('.ant-drawer-title')).toContainText(
    'Current Module:',
  );
  await expect(drawer.locator('.ant-drawer-title')).toContainText(
    navigableModuleName,
  );
});

test('keeps sorting active when searching and filtering module sizes', async ({
  page,
}) => {
  const modules = await openModules(page);
  await sortModules(page, modules, 'Bundled size ↓');
  await modules.getByPlaceholder('search module by keyword').fill('alpha|beta');
  await expectOrder(modules, ['alpha', 'beta']);
  await expectOrder(modules, ['alpha-large.js', 'alpha-small.js']);
  await expectOrder(modules, ['beta-large.js', 'beta-small.js']);
  await expect(modules.getByText('metrics', { exact: true })).toHaveCount(0);

  const sizeInput = page
    .locator('.ant-input-number-group-wrapper')
    .filter({ hasText: 'Module Size' })
    .getByRole('spinbutton');
  await sizeInput.fill('2');
  await expect(
    modules.getByText('alpha-small.js', { exact: true }),
  ).toHaveCount(0);
  await expect(modules.getByText('beta-small.js', { exact: true })).toHaveCount(
    0,
  );
  // With small files removed, beta now has the larger visible directory total.
  await expectOrder(modules, ['beta', 'alpha']);
  await expect(
    modules.getByText('alpha-large.js', { exact: true }),
  ).toBeVisible();
  await expect(
    modules.getByText('beta-large.js', { exact: true }),
  ).toBeVisible();
  await sizeInput.fill('0');
  await expectOrder(modules, ['alpha', 'beta']);
  await expectOrder(modules, ['alpha-large.js', 'alpha-small.js']);
  await expectOrder(modules, ['beta-large.js', 'beta-small.js']);

  await sizeInput.fill('3');
  await expect(
    modules.getByText('alpha-large.js', { exact: true }),
  ).toHaveCount(0);
  // A single remaining directory is compacted into the root; expand it explicitly.
  await modules.getByRole('button', { name: 'column-height' }).click();
  await expect(
    modules.getByText('beta-large.js', { exact: true }),
  ).toBeVisible();
});
