import { AsyncSeriesHook, SyncHook } from 'tapable';
import { describe, expect, it, rs } from '@rstest/core';
import { ModuleGraph } from '@rsdoctor/core/graph';
import type { Plugin } from '@rsdoctor/shared/types';
import { ensureModulesChunksGraphFn } from '@/inner-plugins/plugins/ensureModulesChunkGraph';
import { getRspackNativePlugin } from '@/inner-plugins/plugins/rspack';

function createNativeHooks() {
  return {
    chunkGraph: new SyncHook<[Plugin.RspackNativeChunkGraph]>(['chunkGraph']),
    moduleGraph: new SyncHook<[Plugin.RspackNativeModuleGraph]>([
      'moduleGraph',
    ]),
    moduleIds: new SyncHook<[Plugin.RspackNativeModuleIdsPatch]>(['moduleIds']),
    moduleSources: new SyncHook<[Plugin.RspackNativeModuleSourcePatch]>([
      'moduleSources',
    ]),
    assets: new SyncHook<[Plugin.RspackNativeAssetPatch]>(['assets']),
  };
}

function createHarness() {
  const nativeHooks = createNativeHooks();
  const compilationHook = new SyncHook<[Plugin.BaseCompilation]>([
    'compilation',
  ]);
  const doneHook = new AsyncSeriesHook<[unknown]>(['stats']);
  const RsdoctorPlugin = {
    getCompilationHooks: () => nativeHooks,
  };
  const compiler = {
    webpack: {
      experiments: {
        RsdoctorPlugin,
      },
    },
    hooks: {
      compilation: compilationHook,
      done: doneHook,
    },
    options: {
      devtool: false,
    },
    outputPath: '/tmp',
  } as unknown as Plugin.BaseCompiler;
  const reportModuleGraph = rs.fn();
  const reportChunkGraph = rs.fn();
  const plugin = {
    modulesGraph: new ModuleGraph(),
    options: {
      features: {
        treeShaking: false,
      },
      supports: {
        parseBundle: false,
        generateTileGraph: false,
      },
    },
    sdk: {
      reportModuleGraph,
      reportChunkGraph,
    },
    sourceMapSets: new Map(),
    assetsWithoutSourceMap: new Set(),
  } as any;

  ensureModulesChunksGraphFn(compiler, plugin);
  compilationHook.call({
    hooks: {
      processAssets: new AsyncSeriesHook<[]>([]),
    },
  } as unknown as Plugin.BaseCompilation);

  return {
    doneHook,
    nativeHooks,
    reportChunkGraph,
    reportModuleGraph,
  };
}

describe('Rspack native graph collection', () => {
  it('requires the Rspack Rsdoctor native plugin', () => {
    expect(() =>
      getRspackNativePlugin({
        webpack: {
          experiments: {},
        },
      } as unknown as Plugin.BaseCompiler),
    ).toThrow('does not provide experiments.RsdoctorPlugin');
  });

  it('reports graphs without reading stats', async () => {
    const { doneHook, nativeHooks, reportChunkGraph, reportModuleGraph } =
      createHarness();
    const toJson = rs.fn(() => {
      throw new Error('stats.toJson should not be called');
    });

    nativeHooks.moduleGraph.call({
      modules: [],
      dependencies: [],
      chunkModules: [],
      connectionsOnlyImports: [],
    });
    nativeHooks.chunkGraph.call({
      chunks: [],
      entrypoints: [],
    });

    await doneHook.promise({ toJson });

    expect(toJson).not.toHaveBeenCalled();
    expect(reportModuleGraph).toHaveBeenCalledTimes(1);
    expect(reportChunkGraph).toHaveBeenCalledTimes(1);
  });

  it('fails when native graph hooks do not provide data', async () => {
    const { doneHook } = createHarness();

    await expect(doneHook.promise({})).rejects.toThrow(
      'did not provide chunk graph data',
    );
  });

  it('fails when module graph hook does not provide data', async () => {
    const { doneHook, nativeHooks } = createHarness();

    nativeHooks.chunkGraph.call({
      chunks: [],
      entrypoints: [],
    });

    await expect(doneHook.promise({})).rejects.toThrow(
      'did not provide module graph data',
    );
  });
});
