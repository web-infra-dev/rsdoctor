import { expect, test } from '@playwright/test';
import { getSDK } from '@rsdoctor/core/plugins';
import { compileByWebpack5 } from '@scripts/test-helper';
import { File } from '@rsdoctor/utils/build';
import path from 'path';
import { tmpdir } from 'os';
import { createRsdoctorMultiPlugin } from '../test-utils';

async function compileWithBriefJsonMode(jsonOptions?: any) {
  const file = path.resolve(__dirname, '../fixtures/a.js');
  const loader = path.resolve(__dirname, '../fixtures/loaders/comment.js');

  const outputDir = path.resolve(
    tmpdir(),
    `./rsdoctor_json_test_${Date.now()}`,
  );

  const plugin = createRsdoctorMultiPlugin({
    mode: 'brief',
    output: {
      mode: 'brief',
      reportDir: outputDir,
      options: {
        type: ['json'],
        jsonOptions: jsonOptions || {
          sections: {
            moduleGraph: true,
            chunkGraph: true,
            rules: true,
          },
        },
      },
    },
  });

  // Set the output directory immediately
  plugin.sdk.setOutputDir(outputDir);

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

test('brief mode with JSON type should generate JSON data files', async () => {
  const { outputDir } = await compileWithBriefJsonMode();

  const sdk = getSDK();
  expect(sdk?.type).toBe(0);
  expect(sdk?.extraConfig?.mode).toBe('brief');
  expect(sdk?.extraConfig?.brief).toMatchObject({
    type: ['json'],
    jsonOptions: {
      sections: {
        moduleGraph: true,
        chunkGraph: true,
        rules: true,
      },
    },
  });

  // Check if JSON data files are generated
  const jsonDataPath = path.join(outputDir, 'rsdoctor-data.json');

  // Wait for files to be written
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Check if JSON data file exists
  const jsonDataExists = await File.fse.pathExists(jsonDataPath);
  expect(jsonDataExists).toBeTruthy();

  if (jsonDataExists) {
    const jsonData = await File.fse.readJson(jsonDataPath);
    expect(jsonData).toBeDefined();
    expect(jsonData.moduleGraph).toBeDefined();
    expect(jsonData.chunkGraph).toBeDefined();
  }

  // Cleanup
  try {
    await File.fse.remove(outputDir);
  } catch (e) {
    console.warn('Failed to cleanup test directory:', e);
  }
});

test('brief mode with JSON type should respect sections configuration', async () => {
  const sectionsOptions = {
    sections: {
      moduleGraph: false,
      chunkGraph: true,
      rules: false,
    },
  };

  const { outputDir } = await compileWithBriefJsonMode(sectionsOptions);

  const sdk = getSDK();
  expect(sdk?.extraConfig?.brief).toMatchObject({
    type: ['json'],
    jsonOptions: sectionsOptions,
  });

  // Wait for files to be written
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Check if JSON data file exists
  const jsonDataPath = path.join(outputDir, 'rsdoctor-data.json');
  const jsonDataExists = await File.fse.pathExists(jsonDataPath);
  expect(jsonDataExists).toBeTruthy();

  if (jsonDataExists) {
    const jsonData = await File.fse.readJson(jsonDataPath);
    expect(jsonData).toBeDefined();

    // moduleGraph is disabled, should return empty structure
    expect(jsonData.moduleGraph).toBeDefined();
    expect(jsonData.moduleGraph.modules).toEqual([]);
    expect(jsonData.moduleGraph.dependencies).toEqual([]);

    // chunkGraph is enabled, should have data
    expect(jsonData.chunkGraph).toBeDefined();
    expect(jsonData.chunkGraph.chunks.length).toBeGreaterThan(0);

    // rules (errors) is disabled, should be empty
    expect(jsonData.errors).toBeDefined();
    expect(jsonData.errors).toEqual([]);
  }

  // Cleanup
  try {
    await File.fse.remove(outputDir);
  } catch (e) {
    console.warn('Failed to cleanup test directory:', e);
  }
});

test('brief mode with JSON type and custom sections should generate selective data', async () => {
  const customOptions = {
    sections: {
      moduleGraph: true,
      chunkGraph: false,
      rules: true,
    },
  };

  const { outputDir, plugin } = await compileWithBriefJsonMode(customOptions);

  // Set the output directory
  plugin.sdk.setOutputDir(outputDir);

  const sdk = getSDK();
  expect(sdk?.extraConfig?.brief).toMatchObject({
    type: ['json'],
    jsonOptions: customOptions,
  });

  // Wait for files to be written
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Check if JSON data file exists
  const jsonDataPath = path.join(outputDir, 'rsdoctor-data.json');
  const jsonDataExists = await File.fse.pathExists(jsonDataPath);
  expect(jsonDataExists).toBeTruthy();

  if (jsonDataExists) {
    const jsonData = await File.fse.readJson(jsonDataPath);
    expect(jsonData).toBeDefined();

    // Since chunkGraph is disabled in sections, it should return empty arrays
    expect(jsonData.moduleGraph).toBeDefined();
    expect(jsonData.moduleGraph.modules.length).toBeGreaterThan(0); // moduleGraph is enabled

    expect(jsonData.chunkGraph).toBeDefined();
    expect(jsonData.chunkGraph.chunks).toEqual([]); // chunkGraph is disabled, should be empty
    expect(jsonData.chunkGraph.assets).toEqual([]); // chunkGraph is disabled, should be empty

    expect(jsonData.errors).toBeDefined();
    expect(Array.isArray(jsonData.errors)).toBe(true); // rules is enabled
  }

  // Cleanup
  try {
    await File.fse.remove(outputDir);
  } catch (e) {
    console.warn('Failed to cleanup test directory:', e);
  }
});

test('brief mode with both HTML and JSON types should generate both outputs', async () => {
  const file = path.resolve(__dirname, '../fixtures/a.js');
  const loader = path.resolve(__dirname, '../fixtures/loaders/comment.js');

  const outputDir = path.resolve(
    tmpdir(),
    `./rsdoctor_mixed_test_${Date.now()}`,
  );

  const plugin = createRsdoctorMultiPlugin({
    mode: 'brief',
    output: {
      mode: 'brief',
      reportDir: outputDir,
      options: {
        type: ['html', 'json'],
        htmlOptions: {
          reportHtmlName: 'test-report.html',
          writeDataJson: true,
        },
        jsonOptions: {
          sections: {
            moduleGraph: true,
            chunkGraph: true,
            rules: true,
          },
        },
      },
    },
  });

  // Set the output directory immediately
  plugin.sdk.setOutputDir(outputDir);

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
    type: ['html', 'json'],
    htmlOptions: {
      reportHtmlName: 'test-report.html',
      writeDataJson: true,
    },
    jsonOptions: {
      sections: {
        moduleGraph: true,
        chunkGraph: true,
        rules: true,
      },
    },
  });

  // Wait for files to be written
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Check if both HTML and JSON files are generated
  const htmlReportPath = path.join(outputDir, 'test-report.html');
  const jsonDataPath = path.join(outputDir, 'rsdoctor-data.json');

  const htmlExists = await File.fse.pathExists(htmlReportPath);
  const jsonExists = await File.fse.pathExists(jsonDataPath);

  expect(htmlExists).toBeTruthy();
  expect(jsonExists).toBeTruthy();

  // Cleanup
  try {
    await File.fse.remove(outputDir);
  } catch (e) {
    console.warn('Failed to cleanup test directory:', e);
  }
});
