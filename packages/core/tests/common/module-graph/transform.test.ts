import { describe, it, expect } from '@rstest/core';
import path from 'path';
import fs from 'fs';
import { ModuleGraph } from '@/build-utils/common';
import { Chunks } from '@/build-utils/build';
import { removeAbsModulePath } from '../utils';
import { compileByWebpack5 } from '@scripts/test-helper';
import type { Plugin } from '@rsdoctor/types';

const resolveFixture = (...paths: string[]) => {
  return path.resolve(__dirname, '../../fixtures', ...paths);
};
// TODO: migrate to e2e
describe('module graph transform from stats', () => {
  it('normal module in multi concatenation module', async () => {
    const fixtureName = 'normal-module-in-multi-concatenation';
    const stats = (await compileByWebpack5(
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
      },
    )) as Plugin.StatsCompilation;

    const chunkGraph = Chunks.chunkTransform(new Map(), stats);

    const graph = ModuleGraph.getModuleGraphByStats(
      stats,
      resolveFixture(fixtureName, 'dist'),
      chunkGraph,
    );

    removeAbsModulePath(graph, resolveFixture(fixtureName));

    expect(graph.getModules().length).toEqual(5);
    expect(graph.getDependencies().length).toEqual(2);
    const graphData = graph.toData();
    expect(graphData.modules[0].webpackId.length).toBeTruthy();
    expect(graphData.modules[2]?.issuerPath?.[0]).toBeTruthy();

    graphData.modules.forEach((mod) => {
      // prevent ci failed on win32
      mod.webpackId = '';
      mod.size.sourceSize = -1;
      mod.size.transformedSize = -1;
      mod.size.parsedSize = -1;
      mod.issuerPath = [];
    });
    expect(graphData).toMatchSnapshot();
  });

  it('module type === from origin', async () => {
    const json = fs.readFileSync(
      path.join(__dirname, '../../fixtures/assets/webpack-stats.json'),
      {
        encoding: 'utf-8',
      },
    );
    const statsData = JSON.parse(json);
    const chunkGraph = Chunks.chunkTransform(new Map(), statsData);
    const moduleGraph = ModuleGraph.getModuleGraphByStats(
      statsData,
      '.',
      chunkGraph,
    );
    expect(moduleGraph.toData()).toMatchSnapshot();
  });
});
