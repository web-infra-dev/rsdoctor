import { expect, test, chromium } from '@playwright/test';
import { compileByRspack } from '@scripts/test-helper';
import path from 'path';
import fs from 'fs';
import { createRsdoctorPlugin } from './test-utils';

async function rspackCompile(compile: typeof compileByRspack) {
  const file = path.resolve(__dirname, './fixtures/a.js');
  const loader = path.resolve(__dirname, './fixtures/loaders/comment.js');

  const esmLoader = path.resolve(
    __dirname,
    './fixtures/loaders/esm-serialize-query-to-comment.mjs',
  );

  const res = await compile(file, {
    resolve: {
      extensions: ['.ts', '.js'],
    },
    output: {
      path: path.join(__dirname, '../doctor-rspack/dist/brief'),
    },
    module: {
      rules: [
        {
          test: /\.js/,
          use: loader,
        },
        {
          test: /\.js/,
          use: esmLoader,
        },
        {
          test: /\.[jt]s$/,
          use: {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                },
                externalHelpers: true,
                preserveAllComments: false,
              },
            },
          },
          type: 'javascript/auto',
        },
      ],
    },
    plugins: [
      // @ts-ignore
      createRsdoctorPlugin({
        mode: 'brief',
      }),
    ],
  });

  return res;
}

test.afterEach(async ({ page }) => {
  await page.close();
});

test('rspack brief mode', async () => {
  await rspackCompile(compileByRspack);

  const reportPath = path.join(__dirname, './dist/brief/rsdoctor-report.html');

  fileExists(reportPath);

  const browser = await chromium.launch();

  // Create a new browser context
  const context = await browser.newContext();

  // Open a new page
  const page = await context.newPage();

  // Navigate to a URL
  await page.goto(`file:///${reportPath}`);

  // Perform actions on the page
  const title = await page.title();
  expect(title).toBe('Rsdoctor');

  const titleContent = 'Bundle Overall';

  const bundleTitleExists = await page
    .locator(`text=${titleContent}`)
    .first()
    .isVisible();

  const compileTabExists = await page
    .locator(`text='Compile Analysis'`)
    .first()
    .isVisible();

  const bundleTabExists = await page
    .locator(`text='Bundle Size'`)
    .first()
    .isVisible();

  expect(bundleTitleExists).toBe(true);
  expect(compileTabExists).toBe(true);
  expect(bundleTabExists).toBe(true);

  // Close the page
  await page.close();

  // Close the browser context
  await context.close();

  // Close the browser
  await browser.close();
});

async function fileExists(filePath: string) {
  try {
    await fs.existsSync(filePath);
    return true;
  } catch {
    return false;
  }
}
