import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from '@rstest/core';
import { File } from '@/build-utils';
import { createSDK, type MockSDKResponse } from '../../utils';
import packageJson from '../../../../package.json';

describe('brief json output', () => {
  let target: MockSDKResponse;
  let outputDir: string;

  afterEach(async () => {
    if (target) await target.dispose();
    if (outputDir) await File.fse.remove(outputDir);
  });

  it('should write compact JSON without formatting whitespace', async () => {
    target = await createSDK({
      noServer: true,
      mode: 'brief',
      brief: {
        type: ['json'],
      },
    });
    outputDir = path.resolve(tmpdir(), `rsdoctor_brief_json_${Date.now()}`);
    target.sdk.setOutputDir(outputDir);

    await target.sdk.writeStore();

    const jsonDataPath = path.join(outputDir, 'rsdoctor-data.json');
    const content = fs.readFileSync(jsonDataPath, 'utf-8');

    expect(content).toBe(JSON.stringify(JSON.parse(content)));
  });

  it('emits v1 metadata without changing the brief artifact envelope', async () => {
    target = await createSDK({
      noServer: true,
      mode: 'brief',
      brief: {
        type: ['json'],
        jsonOptions: {
          sections: {
            chunkGraph: true,
            moduleGraph: false,
            rules: false,
          },
        },
      },
    });
    outputDir = path.resolve(tmpdir(), `rsdoctor_brief_json_${Date.now()}`);
    target.sdk.setOutputDir(outputDir);

    await target.sdk.writeStore();

    const artifact = JSON.parse(
      fs.readFileSync(path.join(outputDir, 'rsdoctor-data.json'), 'utf-8'),
    );

    expect(Object.keys(artifact)).toEqual(['data', 'clientRoutes', 'metadata']);
    expect(artifact.metadata).toMatchObject({
      schemaVersion: 1,
      producer: {
        name: '@rsdoctor/core',
        version: packageJson.version,
      },
      output: { mode: 'brief' },
      build: {
        id: artifact.data.hash,
        root: artifact.data.root,
        compiler: { name: 'test' },
      },
      sections: {
        chunkGraph: { status: 'collected' },
        errors: { status: 'omitted', reason: 'not-selected' },
        moduleGraph: { status: 'omitted', reason: 'not-selected' },
        moduleCodeMap: { status: 'omitted', reason: 'output-mode' },
        treeShaking: { status: 'omitted', reason: 'output-mode' },
      },
    });
    expect(artifact.data.chunkGraph).toEqual({
      assets: [],
      chunks: [],
      entrypoints: [],
    });
    expect(artifact.data.moduleGraph).toEqual({
      dependencies: [],
      modules: [],
      moduleGraphModules: [],
      exports: [],
      sideEffects: [],
      variables: [],
      layers: [],
    });
    expect(artifact.data.errors).toEqual([]);
  });

  it('emits v1 metadata on normal manifests without changing sharded data', async () => {
    target = await createSDK({ noServer: true });
    outputDir = path.resolve(tmpdir(), `rsdoctor_normal_json_${Date.now()}`);
    target.sdk.setOutputDir(outputDir);

    const manifestPath = await target.sdk.writeStore();
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    expect(manifest.client.enableRoutes).toEqual(['Overall']);
    expect(manifest.data.summary).toBeInstanceOf(Array);
    expect(manifest.metadata).toMatchObject({
      schemaVersion: 1,
      producer: {
        name: '@rsdoctor/core',
        version: packageJson.version,
      },
      output: { mode: 'normal' },
      build: {
        id: target.sdk.getHash(),
        root: target.sdk.root,
        compiler: { name: 'test' },
      },
      sections: {
        chunkGraph: { status: 'collected' },
        moduleGraph: { status: 'collected' },
        packageGraph: { status: 'omitted', reason: 'not-collected' },
        treeShaking: { status: 'omitted', reason: 'feature-disabled' },
      },
    });
  });
});
