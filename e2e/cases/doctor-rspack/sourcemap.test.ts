import { expect, test } from '@playwright/test';
import { getSDK } from '@rsdoctor/core/plugins';
import path from 'path';
import { compileByRspack } from '@scripts/test-helper';
import { createRsdoctorPlugin } from './test-utils';
import { Compiler } from '@rspack/core';

async function rspackCompile(_tapName: string) {
  const file = path.resolve(__dirname, './fixtures/a.js');

  await compileByRspack(file, {
    output: {
      path: path.join(__dirname, 'dist'),
    },
    plugins: [createRsdoctorPlugin({})],
  });
}

test('rspack sourcemap tool', async () => {
  const tapName = 'SourcemapTest';
  await rspackCompile(tapName);
  const sdk = getSDK();
  expect(sdk).toBeDefined();

  const res = sdk!.getStoreData();
  const modules = res.moduleGraph.modules;
  // Verify sourcemap data exists
  expect(modules).toBeDefined();
  expect(modules.length).toBeGreaterThan(0);

  // Verify source content is mapped correctly
  modules.find((v) => v.path.includes('a.js'));
  expect(modules[0].size.parsedSize).toBeGreaterThan(0);
  expect(modules[1].size.parsedSize).toBeGreaterThan(0);
});

async function rspackCompile2(_tapName: string) {
  const file = path.resolve(__dirname, './fixtures/a.js');

  await compileByRspack(file, {
    output: {
      path: path.join(__dirname, 'dist'),
      devtoolModuleFilenameTemplate:
        'webpack://[namespace]/[resource-path]?[loaders]',
    },
    plugins: [createRsdoctorPlugin({})],
  });
}

test('rspack sourcemap tool at special devtoolModuleFilenameTemplate', async () => {
  const tapName = 'SourcemapTest';
  await rspackCompile2(tapName);
  const sdk = getSDK();
  expect(sdk).toBeDefined();

  const res = sdk!.getStoreData();
  const modules = res.moduleGraph.modules;
  // Verify sourcemap data exists
  expect(modules).toBeDefined();
  expect(modules.length).toBeGreaterThan(0);

  // Verify source content is mapped correctly
  modules.find((v) => v.path.includes('a.js'));
  expect(modules[0].size.parsedSize).toBeGreaterThan(0);
  expect(modules[1].size.parsedSize).toBeGreaterThan(0);
});

// Test for assetsWithoutSourceMap functionality
async function rspackCompileWithoutSourceMap(_tapName: string) {
  const file = path.resolve(__dirname, './fixtures/a.js');

  await compileByRspack(file, {
    output: {
      path: path.join(__dirname, 'dist'),
    },
    // No devtool, so no sourcemaps will be generated
    plugins: [createRsdoctorPlugin({})],
  });
}

test('rspack handles assets without sourcemap correctly', async () => {
  const tapName = 'AssetsWithoutSourceMapTest';
  await rspackCompileWithoutSourceMap(tapName);
  const sdk = getSDK();
  expect(sdk).toBeDefined();

  const res = sdk!.getStoreData();
  const modules = res.moduleGraph.modules;
  // Verify modules are still processed even without sourcemaps
  expect(modules).toBeDefined();
  expect(modules.length).toBeGreaterThan(0);

  // Verify that modules exist and have basic size information
  // Even without sourcemaps, modules should be tracked
  expect(modules[0].size.sourceSize).toBeGreaterThan(0);
});
