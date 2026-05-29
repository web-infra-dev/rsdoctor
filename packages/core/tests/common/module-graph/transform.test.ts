import { describe, expect, it } from '@rstest/core';
import path from 'path';

import { Chunks } from '@/build-utils/build';
import { ModuleGraphTrans } from '@rsdoctor/graph';
import { SDK, type Plugin } from '@rsdoctor/types';
import { compileByRspack } from '@scripts/test-helper';
import { removeAbsModulePath } from '../utils';

const resolveFixture = (...paths: string[]) => {
  return path.resolve(__dirname, '../../fixtures', ...paths);
};

const statsOptions = {
  all: false,
  assets: true,
  chunks: true,
  chunkModules: true,
  ids: true,
  modules: true,
  nestedModules: true,
  orphanModules: true,
  reasons: true,
  source: true,
};

describe('module graph transform from rspack stats', () => {
  it('normal module in multi concatenation module', async () => {
    const fixtureName = 'normal-module-in-multi-concatenation';
    const fixtureRoot = resolveFixture(fixtureName);
    const stats = (await compileByRspack(
      {
        entry1: resolveFixture(fixtureName, 'entry1.js'),
        entry2: resolveFixture(fixtureName, 'entry2.js'),
      },
      {
        output: {
          path: resolveFixture(fixtureName, 'dist'),
          filename: '[name].js',
          chunkFilename: '[name].js',
        },
        optimization: {
          concatenateModules: true,
        },
      },
      statsOptions,
    )) as Plugin.StatsCompilation;

    expect(stats.modules?.length).toBeGreaterThan(0);

    const chunkGraph = Chunks.chunkTransform(new Map(), stats);
    const chunkData = chunkGraph.toData();
    const graph = ModuleGraphTrans.getModuleGraphByStats(
      stats,
      fixtureRoot,
      chunkGraph,
    );

    removeAbsModulePath(graph, fixtureRoot);

    const graphData = graph.toData();
    const modulePaths = graphData.modules.map((item) => item.path).sort();

    expect(graphData.modules.length).toBeGreaterThanOrEqual(3);
    expect(modulePaths).toEqual(
      expect.arrayContaining(['common.js', 'entry1.js', 'entry2.js']),
    );
    expect(
      chunkData.chunks
        .map((item) => ({
          name: item.name,
          assets: item.assets,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    ).toEqual([
      {
        name: 'entry1',
        assets: ['entry1.js'],
      },
      {
        name: 'entry2',
        assets: ['entry2.js'],
      },
    ]);

    const concatenatedModules = graphData.modules.filter(
      (item) => item.kind === SDK.ModuleKind.Concatenation,
    );
    const commonModule = graphData.modules.find(
      (item) => item.path === 'common.js',
    );

    expect(concatenatedModules.length).toBe(2);
    expect(
      concatenatedModules.every((item) => item.modules?.length === 2),
    ).toBe(true);
    expect(commonModule?.chunks.sort()).toEqual(['0', '1']);
    expect(graphData.dependencies.length).toBe(2);
    expect(
      graphData.dependencies.every((item) => item.request === './common.js'),
    ).toBe(true);
    expect(graphData.modules.every((item) => item.identifier)).toBe(true);
  });
});
