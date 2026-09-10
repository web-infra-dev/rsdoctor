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

  const ecmaTab = page.getByRole('tab', { name: /ECMA Version Check/ });
  await expect(ecmaTab).toHaveAttribute('aria-selected', 'true');

  const emptyTab = page.getByRole('tab', { name: /Duplicate Packages/ });
  await emptyTab.click();
  await expect(emptyTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toContainText('No Data');

  await ecmaTab.click();
  await expect(ecmaTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toContainText('ECMA Version Check');

  await page.goto(`${pathToFileURL(reportPath).href}#/bundle/size`);
  const charts = page.locator('[class*="chartsContainer"] > div');
  await expect(charts).toHaveCount(4);

  const expectCardsToFit = async () => {
    await expect
      .poll(() =>
        charts.evaluateAll((cards) =>
          cards.every((card) => {
            const bounds = card.getBoundingClientRect();
            const selector = card
              .querySelector('[class*="metricSelector"]')!
              .getBoundingClientRect();
            const progress = card
              .querySelector('.ant-progress')!
              .getBoundingClientRect();
            const modeSelector = card
              .querySelector('[class*="cardTitle"] .ant-segmented')
              ?.getBoundingClientRect();
            const value = card
              .querySelector('[class*="metricValue"]')!
              .getBoundingClientRect();
            const details = card.querySelector('[class*="details"]')!;
            return (
              selector.right <= bounds.right &&
              progress.right <= selector.left &&
              (!modeSelector ||
                (modeSelector.right <= bounds.right &&
                  Math.abs(modeSelector.left - selector.left) <= 1)) &&
              Math.abs(value.left - selector.left) <= 1 &&
              getComputedStyle(details).textAlign === 'left'
            );
          }),
        ),
      )
      .toBe(true);
  };

  for (const width of [1280, 1366, 1440, 1536, 1600, 1920, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    await expectCardsToFit();
  }

  // A wide viewport can still contain a narrow report panel.
  await charts.first().evaluate((chart) => {
    chart.parentElement!.parentElement!.parentElement!.style.width = '1216px';
  });
  await expectCardsToFit();
});

function fileExists(filePath: string) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}
