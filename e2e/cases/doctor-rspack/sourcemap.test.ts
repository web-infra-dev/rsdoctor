import { expect, test } from '@playwright/test';
import { getSDK } from '@rsdoctor/core/plugins';
import path from 'path';
import { compileByRspack } from '@scripts/test-helper';
import { createRsdoctorPlugin } from './test-utils';

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

  const res = sdk.getStoreData();
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

  const res = sdk.getStoreData();
  const modules = res.moduleGraph.modules;
  // Verify sourcemap data exists
  expect(modules).toBeDefined();
  expect(modules.length).toBeGreaterThan(0);

  // Verify source content is mapped correctly
  modules.find((v) => v.path.includes('a.js'));
  expect(modules[0].size.parsedSize).toBeGreaterThan(0);
  expect(modules[1].size.parsedSize).toBeGreaterThan(0);
});
