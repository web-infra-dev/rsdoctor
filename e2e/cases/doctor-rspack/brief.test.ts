import { expect, test } from '@test-kit/rstest';
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
        output: {
          mode: 'brief',
        },
      }),
    ],
  });

  return res;
}

test('rspack brief mode', async ({ page }) => {
  await rspackCompile(compileByRspack);

  const reportPath = path.join(__dirname, './dist/brief/rsdoctor-report.html');

  expect(fileExists(reportPath)).toBe(true);

  // Navigate to a URL
  await page.goto(pathToFileURL(reportPath).href);

  // Perform actions on the page
  const title = await page.title();
  expect(title).toBe('Rsdoctor');

  const titleContent = 'Bundle Overall';

  await expect(page.locator(`text=${titleContent}`).first()).toBeVisible({
    timeout: 10000,
  });
  await expect(page.locator(`text='Compile Analysis'`).first()).toBeVisible({
    timeout: 10000,
  });
  await expect(page.locator(`text='Bundle Size'`).first()).toBeVisible({
    timeout: 10000,
  });
});

function fileExists(filePath: string) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}
