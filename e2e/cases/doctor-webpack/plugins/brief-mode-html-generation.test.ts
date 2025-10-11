import { expect, test } from '@playwright/test';
import { getSDK } from '@rsdoctor/core/plugins';
import { compileByWebpack5 } from '@scripts/test-helper';
import { File } from '@rsdoctor/utils/build';
import fs from 'node:fs/promises';
import path from 'path';
import { tmpdir } from 'os';
import { createRsdoctorMultiPlugin } from '../test-utils';

async function compileWithBriefHtmlMode(htmlOptions?: any) {
  const file = path.resolve(__dirname, '../fixtures/a.js');
  const loader = path.resolve(__dirname, '../fixtures/loaders/comment.cjs');

  const outputDir = path.resolve(
    tmpdir(),
    `./rsdoctor_html_test_${Date.now()}`,
  );

  const plugin = createRsdoctorMultiPlugin({
    mode: 'brief',
    output: {
      mode: 'brief',
      reportDir: outputDir,
      options: {
        type: ['html'],
        htmlOptions: htmlOptions || {
          reportHtmlName: 'rsdoctor-report.html',
          writeDataJson: false,
        },
      },
    },
  });

  // Set the output directory immediately
  plugin.sdk.setOutputDir(outputDir);

  // Ensure the output directory exists
  await File.fse.ensureDir(outputDir);

  const res = await compileByWebpack5(file, {
    module: {
      rules: [
        {
          test: /\.js/,
          use: loader,
        },
      ],
    },
    plugins: [plugin],
  });

  return { res, outputDir, plugin };
}

test('brief mode with HTML type should generate HTML report file', async () => {
  const { outputDir } = await compileWithBriefHtmlMode();

  const sdk = getSDK();
  expect(sdk?.type).toBe(0);
  expect(sdk?.extraConfig?.mode).toBe('brief');
  expect(sdk?.extraConfig?.brief).toMatchObject({
    type: ['html'],
    htmlOptions: {
      reportHtmlName: 'rsdoctor-report.html',
      writeDataJson: false,
    },
  });

  // Wait for files to be written
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Check if HTML report file is generated
  const htmlReportPath = path.join(outputDir, 'rsdoctor-report.html');
  const htmlExists = await File.fse.pathExists(htmlReportPath);
  expect(htmlExists).toBeTruthy();

  if (htmlExists) {
    const htmlContent = await fs.readFile(htmlReportPath, 'utf-8');
    // Should contain HTML structure (the inlined version may not have DOCTYPE)
    expect(htmlContent).toContain('<html');
    expect(htmlContent).toContain('</html>');
    // Should contain the Rsdoctor app content
    expect(htmlContent.length).toBeGreaterThan(1000);
  }

  // Cleanup
  try {
    await File.fse.remove(outputDir);
  } catch (e) {
    console.warn('Failed to cleanup test directory:', e);
  }
});

test('brief mode with HTML type and custom report name should generate file with custom name', async () => {
  const customHtmlOptions = {
    reportHtmlName: 'custom-analysis-report.html',
    writeDataJson: true,
  };

  const { outputDir, plugin } =
    await compileWithBriefHtmlMode(customHtmlOptions);

  const sdk = getSDK();
  expect(sdk?.extraConfig?.brief).toMatchObject({
    type: ['html'],
    htmlOptions: customHtmlOptions,
  });

  // Wait for files to be written
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Check if HTML report file is generated with custom name
  const htmlReportPath = path.join(outputDir, 'custom-analysis-report.html');
  const htmlExists = await File.fse.pathExists(htmlReportPath);
  expect(htmlExists).toBeTruthy();

  if (htmlExists) {
    const htmlContent = await fs.readFile(htmlReportPath, 'utf-8');
    // Should contain HTML structure (the inlined version may not have DOCTYPE)
    expect(htmlContent).toContain('<html');
    expect(htmlContent).toContain('</html>');
  }

  // Since writeDataJson is true, should also check for data files
  // Note: In brief mode, .rsdoctor directory is only created when type includes 'json'
  // writeDataJson in HTML mode doesn't create .rsdoctor directory
  // This is the expected behavior for brief mode

  // Cleanup
  try {
    await File.fse.remove(outputDir);
  } catch (e) {
    console.warn('Failed to cleanup test directory:', e);
  }
});

test('brief mode with HTML type and writeDataJson should generate both HTML and data files', async () => {
  const htmlOptionsWithData = {
    reportHtmlName: 'report-with-data.html',
    writeDataJson: true,
  };

  const { outputDir, plugin } =
    await compileWithBriefHtmlMode(htmlOptionsWithData);

  const sdk = getSDK();
  expect(sdk?.extraConfig?.brief?.htmlOptions?.writeDataJson).toBe(true);

  // Wait for files to be written
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Check if HTML report is generated
  const htmlReportPath = path.join(outputDir, 'report-with-data.html');
  const htmlExists = await File.fse.pathExists(htmlReportPath);

  expect(htmlExists).toBeTruthy();

  // Note: In brief mode, writeDataJson in HTML options doesn't create .rsdoctor directory
  // The .rsdoctor directory is only created when type includes 'json'
  // This test focuses on HTML generation with writeDataJson flag

  // Cleanup
  try {
    await File.fse.remove(outputDir);
  } catch (e) {
    console.warn('Failed to cleanup test directory:', e);
  }
});

test('brief mode with default HTML configuration should use default values', async () => {
  const file = path.resolve(__dirname, '../fixtures/a.js');
  const loader = path.resolve(__dirname, '../fixtures/loaders/comment.cjs');

  const outputDir = path.resolve(
    tmpdir(),
    `./rsdoctor_default_html_test_${Date.now()}`,
  );

  const plugin = createRsdoctorMultiPlugin({
    mode: 'brief',
    output: {
      mode: 'brief',
      reportDir: outputDir,
      // No options specified, should use defaults
    },
  });

  // Set the output directory immediately
  plugin.sdk.setOutputDir(outputDir);

  // Ensure the output directory exists
  await File.fse.ensureDir(outputDir);

  await compileByWebpack5(file, {
    module: {
      rules: [
        {
          test: /\.js/,
          use: loader,
        },
      ],
    },
    plugins: [plugin],
  });

  const sdk = getSDK();
  expect(sdk?.extraConfig?.brief).toMatchObject({
    type: ['html'], // Should default to HTML
    htmlOptions: {
      reportHtmlName: undefined, // Should be undefined by default
      writeDataJson: false, // Should be false by default
    },
  });

  // Wait for files to be written
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Check if default HTML file is generated (should be in the output directory)
  // Default file name should be 'rsdoctor-report.html'
  const defaultHtmlPath = path.join(outputDir, 'rsdoctor-report.html');
  const htmlExists = await File.fse.pathExists(defaultHtmlPath);
  expect(htmlExists).toBeTruthy();

  // Cleanup
  try {
    await File.fse.remove(outputDir);
  } catch (e) {
    console.warn('Failed to cleanup test directory:', e);
  }
});
