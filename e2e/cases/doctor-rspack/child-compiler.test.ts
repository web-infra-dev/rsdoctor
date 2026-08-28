import { expect, test } from '@test-kit/rstest';
import { compileByRspack } from '@scripts/test-helper';
import { Compiler, EntryPlugin } from '@rspack/core';
import { access, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'path';
import { createRsdoctorPlugin, getChildSDK } from './test-utils';

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
  const childSDK = getChildSDK(doctor.sdk, child?.compilerPath);
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

test('writes child compiler data to an isolated brief report', async () => {
  const mainEntry = path.resolve(__dirname, './fixtures/a.js');
  const childEntry = path.resolve(__dirname, './fixtures/b.js');
  const reportDir = path.join(tmpdir(), `rsdoctor-child-brief-${Date.now()}`);
  const doctor = createRsdoctorPlugin({
    output: {
      mode: 'brief',
      reportDir,
      options: {
        type: ['html', 'json'],
      },
    },
  });

  try {
    await compileByRspack(mainEntry, {
      plugins: [doctor, new ChildCompilerPlugin(childEntry)],
    });

    const child = doctor.sdk
      .getManifestData()
      .series?.find((item) => item.isChild);
    const childSDK = getChildSDK(doctor.sdk, child?.compilerPath);

    if (!childSDK) {
      throw new Error('Expected child compiler SDK to be registered');
    }

    const childReportDir = path.join(
      reportDir,
      '.slaves',
      childSDK.name.replace(/\s+/g, '-'),
    );
    await Promise.all([
      access(path.join(reportDir, 'rsdoctor-report.html')),
      access(path.join(childReportDir, 'rsdoctor-report.html')),
    ]);

    const mainReport = JSON.parse(
      await readFile(path.join(reportDir, 'rsdoctor-data.json'), 'utf-8'),
    );
    const childReport = JSON.parse(
      await readFile(path.join(childReportDir, 'rsdoctor-data.json'), 'utf-8'),
    );

    expect(
      mainReport.data.moduleGraph.modules.some(
        (item: { path: string }) => item.path === mainEntry,
      ),
    ).toBe(true);
    expect(
      mainReport.data.moduleGraph.modules.some(
        (item: { path: string }) => item.path === childEntry,
      ),
    ).toBe(false);
    expect(
      childReport.data.moduleGraph.modules.some(
        (item: { path: string }) => item.path === childEntry,
      ),
    ).toBe(true);
  } finally {
    await rm(reportDir, { recursive: true, force: true });
  }
});
