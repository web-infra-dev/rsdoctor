import { expect, test } from '@test-kit/rstest';
import { compileByRspack } from '@scripts/test-helper';
import * as core from '@actions/core';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'node:url';
import { createRsdoctorPlugin } from './test-utils';

const ecmaVersion = 3;

async function rspackCompile(compile: typeof compileByRspack) {
  const file = path.resolve(__dirname, './fixtures/c.js');

  const res = await compile(file, {
    resolve: {
      extensions: ['.ts', '.js'],
    },
    output: {
      path: path.join(__dirname, '../doctor-rspack/dist/linter-rule-render'),
    },
    module: {
      rules: [
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
        linter: {
          rules: {
            'ecma-version-check': [
              'Warn',
              {
                ecmaVersion,
              },
            ],
          },
        },
      }),
    ],
  });

  return res;
}

test('linter rule render check', async ({ page }) => {
  await rspackCompile(compileByRspack);

  const reportPath = path.join(
    __dirname,
    `./dist/linter-rule-render/rsdoctor-report.html`,
  );

  expect(fileExists(reportPath)).toBe(true);

  // Navigate to a URL
  await page.goto(pathToFileURL(reportPath).href);
  core.debug(`reportPath:: ${reportPath}`);

  const ecmaVersionButton = await page.$('[data-node-key="E1004"]');
  core.debug(`ecmaVersionButton:: ${ecmaVersionButton}`);

  // TODO: fix this test case
  // await ecmaVersionButton?.click();
  // // ignore output text check because there's no .map file for track the source code
  // const source = await page.$('.e2e-ecma-source');
  // const error = await page.$('.e2e-ecma-error');

  // core.debug(`source:: ${source}`);
  // core.debug(`error:: ${error}`);

  // const sourceText = await source?.textContent();
  // const errorText = await error?.textContent();

  // core.debug(`sourceText:: ${sourceText}`);
  // core.debug(`errorText:: ${errorText}`);

  // expect(sourceText).toBe(
  //   '/cases/doctor-rspack/dist/linter-rule-render/main.js:1:2',
  // );
  // expect(errorText).toBe(
  //   `Find some syntax that does not match "ecmaVersion <= ${ecmaVersion}"`,
  // );
});

function fileExists(filePath: string) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}
