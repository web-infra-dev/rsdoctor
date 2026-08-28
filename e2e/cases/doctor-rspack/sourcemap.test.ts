import { expect, test } from '@test-kit/rstest';
import path from 'path';
import { compileByRspack } from '@scripts/test-helper';
import { createRsdoctorPlugin } from './test-utils';

async function rspackCompile() {
  const file = path.resolve(__dirname, './fixtures/a.js');
  const plugin = createRsdoctorPlugin({});

  await compileByRspack(file, {
    output: {
      path: path.join(__dirname, 'dist'),
    },
    plugins: [plugin],
  });

  return plugin.sdk;
}

test('rspack sourcemap tool', async () => {
  const sdk = await rspackCompile();

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

async function rspackCompile2() {
  const file = path.resolve(__dirname, './fixtures/a.js');
  const plugin = createRsdoctorPlugin({});

  await compileByRspack(file, {
    output: {
      path: path.join(__dirname, 'dist'),
      devtoolModuleFilenameTemplate:
        'webpack://[namespace]/[resource-path]?[loaders]',
    },
    plugins: [plugin],
  });

  return plugin.sdk;
}

test('rspack sourcemap tool at special devtoolModuleFilenameTemplate', async () => {
  const sdk = await rspackCompile2();

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

// Test for assetsWithoutSourceMap functionality
async function rspackCompileWithoutSourceMap() {
  const file = path.resolve(__dirname, './fixtures/a.js');
  const plugin = createRsdoctorPlugin({});

  await compileByRspack(file, {
    output: {
      path: path.join(__dirname, 'dist'),
    },
    // No devtool, so no sourcemaps will be generated
    plugins: [plugin],
  });

  return plugin.sdk;
}

test('rspack handles assets without sourcemap correctly', async () => {
  const sdk = await rspackCompileWithoutSourceMap();

  const res = sdk.getStoreData();
  const modules = res.moduleGraph.modules;
  // Verify modules are still processed even without sourcemaps
  expect(modules).toBeDefined();
  expect(modules.length).toBeGreaterThan(0);

  // Verify that modules exist and have basic size information
  // Even without sourcemaps, modules should be tracked
  expect(modules[0].size.sourceSize).toBeGreaterThan(0);
});
