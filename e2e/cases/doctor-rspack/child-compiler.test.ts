import { expect, test } from '@playwright/test';
import { getSDK } from '@rsdoctor/core/plugins';
import { compileByRspack } from '@scripts/test-helper';
import { Compiler, EntryPlugin } from '@rspack/core';
import path from 'path';
import { createRsdoctorPlugin } from './test-utils';

class ChildCompilerPlugin {
  constructor(private readonly entry: string) {}

  apply(compiler: Compiler) {
    compiler.hooks.make.tapAsync(
      'ChildCompilerPlugin',
      (compilation, callback) => {
        const childCompiler = compilation.createChildCompiler(
          'child-demo',
          {
            filename: 'child-demo.js',
          } as Compiler['options']['output'],
          [
            new EntryPlugin(compiler.context, this.entry, {
              name: 'child-demo',
            }),
          ],
        );

        childCompiler.runAsChild((error) => callback(error));
      },
    );
  }
}

test.afterEach(async ({ page }) => {
  await page.close();
});

test('collects child compiler data in an isolated report', async () => {
  const mainEntry = path.resolve(__dirname, './fixtures/a.js');
  const childEntry = path.resolve(__dirname, './fixtures/b.js');
  const doctor = createRsdoctorPlugin({});

  await compileByRspack(mainEntry, {
    module: {
      rules: [
        {
          test: /\.js$/,
          loader: 'builtin:swc-loader',
        },
      ],
    },
    plugins: [doctor, new ChildCompilerPlugin(childEntry)],
  });

  const rootData = doctor.sdk.getStoreData();
  const series = doctor.sdk.getManifestData().series || [];
  const child = series.find((item) => item.isChild);
  const childSDK = getSDK(child?.compilerPath);
  const childData = childSDK?.getStoreData();

  expect(series).toHaveLength(2);
  expect(series[0]).toMatchObject({
    displayName: 'Main compiler',
    compilerPath: '',
    isChild: false,
  });
  expect(child).toMatchObject({
    displayName: 'child-demo',
    compilerPath: 'child-demo|0|',
    parentCompilerPath: '',
    isChild: true,
  });
  expect(
    rootData.moduleGraph.modules.some((item) => item.path === mainEntry),
  ).toBe(true);
  expect(
    rootData.moduleGraph.modules.some((item) => item.path === childEntry),
  ).toBe(false);
  expect(
    childData?.moduleGraph.modules.some((item) => item.path === childEntry),
  ).toBe(true);
  expect(
    childData?.chunkGraph.assets.some((item) => item.path === 'child-demo.js'),
  ).toBe(true);
  expect(
    rootData.loader.some((item) => item.resource.path === childEntry),
  ).toBe(false);
  expect(
    childData?.loader.some((item) => item.resource.path === childEntry),
  ).toBe(true);
});
