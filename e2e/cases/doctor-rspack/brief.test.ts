import { expect, test } from '@playwright/test';
import { compileByRspack } from '@scripts/test-helper';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'node:url';
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

test('rspack brief mode', async ({ page }) => {
  await rspackCompile(compileByRspack);

  const reportPath = path.join(__dirname, './dist/brief/rsdoctor-report.html');
  const chunkFailures: string[] = [];

  page.on('pageerror', (error) => {
    if (
      /ChunkLoadError|Loading (?:CSS )?chunk|CSS_CHUNK_LOAD_FAILED/i.test(
        error.message,
      )
    ) {
      chunkFailures.push(error.message);
    }
  });
  page.on('requestfailed', (request) => {
    if (/\/resource\/(?:js|css)\/async\//.test(request.url())) {
      chunkFailures.push(request.url());
    }
  });

  fileExists(reportPath);

  // Navigate to a URL
  await page.goto(pathToFileURL(reportPath).href);

  // Perform actions on the page
  const title = await page.title();
  expect(title).toBe('Rsdoctor');

  await expect(page.getByText('Bundle Overall').first()).toBeVisible();
  await expect(page.getByText('Compile Analysis').first()).toBeVisible();
  await expect(page.getByText('Bundle Size').first()).toBeVisible();

  for (const [route, text] of [
    ['/bundle/size', 'Tree Graph'],
    ['/loaders/overall', 'Loader Timeline'],
    ['/plugins', 'Plugins Overall'],
  ]) {
    await page.evaluate((nextRoute) => {
      window.location.hash = nextRoute;
    }, route);
    await expect(page.getByText(text).first()).toBeVisible();
  }

  expect(chunkFailures).toEqual([]);
});

async function fileExists(filePath: string) {
  try {
    await fs.existsSync(filePath);
    return true;
  } catch {
    return false;
  }
}
