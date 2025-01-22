import { expect, test, webkit } from '@playwright/test';
import { getSDK, setSDK } from '@rsdoctor/core/plugins';
import { compileByRspack } from '@scripts/test-helper';
import { Compiler } from '@rspack/core';
import path from 'path';
import fs from 'fs';
import { createRsdoctorPlugin } from './test-utils';
import { devtools } from 'vue';

let reportLoaderStartOrEndTimes = 0;
const ecmaVersion = 3;

async function rspackCompile(
  _tapName: string,
  compile: typeof compileByRspack,
) {
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
              sourceMap: true,
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
      {
        name: 'Foo',
        apply(compiler: Compiler) {
          compiler.hooks.beforeRun.tapPromise(
            { name: 'Foo', stage: 99999 },
            async () => {
              const sdk = getSDK();
              setSDK(
                new Proxy(sdk, {
                  get(target, key, receiver) {
                    switch (key) {
                      case 'reportLoader':
                        return null;
                      case 'reportLoaderStartOrEnd':
                        return (_data: any) => {
                          reportLoaderStartOrEndTimes += 1;
                        };
                      default:
                        return Reflect.get(target, key, receiver);
                    }
                  },
                  set(target, key, value, receiver) {
                    return Reflect.set(target, key, value, receiver);
                  },
                  defineProperty(target, p, attrs) {
                    return Reflect.defineProperty(target, p, attrs);
                  },
                }),
              );
            },
          );
        },
      },
    ],
  });

  return res;
}

test('linter rule render check', async () => {
  const tapName = 'Foo';
  await rspackCompile(tapName, compileByRspack);

  const reportPath = path.join(
    __dirname,
    './dist/linter-rule-render/.rsdoctor/rsdoctor-report.html',
  );

  fileExists(reportPath);

  const browser = await webkit.launch();

  // Create a new browser context
  const context = await browser.newContext();

  // Open a new page
  const page = await context.newPage();

  // Navigate to a URL
  await page.goto(`file:///${reportPath}`);

  const ecmaVersionButton = await page.$('[data-node-key="E1004"]');
  await ecmaVersionButton?.click();
  await page.waitForSelector('.box_4a48c');
  // ignore output text check because there's no .map file for track the source code
  const [source, , error] = await page.$$('.box_4a48c');
  const sourceText = await source?.textContent();
  const errorText = await error?.textContent();
  expect(sourceText).toBe(
    '/cases/doctor-rspack/dist/linter-rule-render/main.js:1:2',
  );
  expect(errorText).toBe(
    `Find some syntax that does not match "ecmaVersion <= ${ecmaVersion}"`,
  );

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
