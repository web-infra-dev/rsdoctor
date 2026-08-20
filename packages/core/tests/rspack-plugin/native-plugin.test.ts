import { gzipSync } from 'node:zlib';
import { AsyncSeriesHook, SyncHook } from '@rspack/lite-tapable';
import { describe, expect, it, rs } from '@rstest/core';
import { ModuleGraph } from '@rsdoctor/shared/graph';
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

function createHarness(watchMode = false) {
  const nativeHooks = createNativeHooks();
  const compilationHook = new SyncHook<[Plugin.BaseCompilation]>([
    'compilation',
  ]);
  const doneHook = new AsyncSeriesHook<[unknown]>(['stats']);
  const RsdoctorPlugin = {
    getCompilationHooks: () => nativeHooks,
  };
  const compiler = {
    watchMode,
    rspack: {
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
        gzip: {
          gzipLevel: 9,
        },
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
    compiler,
    doneHook,
    modulesGraph: plugin.modulesGraph,
    nativeHooks,
    reportChunkGraph,
    reportModuleGraph,
  };
}

function createNativeModule(
  data: Partial<Plugin.RspackNativeModule> &
    Pick<Plugin.RspackNativeModule, 'ukey' | 'identifier' | 'path'>,
): Plugin.RspackNativeModule {
  return {
    isEntry: false,
    kind: 'normal',
    layer: undefined,
    dependencies: [],
    imported: [],
    modules: [],
    belongModules: [],
    chunks: [],
    issuerPath: [],
    bailoutReason: [],
    sideEffectsLocations: [],
    exportsType: 'namespace',
    ...data,
  };
}

describe('Rspack native graph collection', () => {
  it('requires the Rspack Rsdoctor native plugin', () => {
    expect(() =>
      getRspackNativePlugin({
        rspack: {
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

  it.each([
    { watchMode: true, expectedGzipSize: 0 },
    {
      watchMode: false,
      expectedGzipSize: gzipSync('export const value = 1;', { level: 9 })
        .length,
    },
  ])(
    'uses watchMode=$watchMode when calculating module gzip sizes',
    async ({ watchMode, expectedGzipSize }) => {
      const { doneHook, modulesGraph, nativeHooks } = createHarness(watchMode);
      const source = 'export const value = 1;';

      nativeHooks.chunkGraph.call({ chunks: [], entrypoints: [] });
      nativeHooks.moduleGraph.call({
        modules: [
          createNativeModule({
            ukey: 1,
            identifier: '/src/index.js',
            path: '/src/index.js',
          }),
        ],
        dependencies: [],
        chunkModules: [],
        connectionsOnlyImports: [],
      });
      nativeHooks.moduleSources.call({
        moduleOriginalSources: [
          {
            module: 1,
            source,
            size: source.length,
          },
        ],
        jsonModuleSizes: [],
      });

      await doneHook.promise({});

      expect(modulesGraph.getModuleById(1)?.getSize().gzipSize).toBe(
        expectedGzipSize,
      );
    },
  );

  it('clears module gzip sizes when a compiler switches to watch mode', async () => {
    const { compiler, doneHook, modulesGraph, nativeHooks } = createHarness();
    const source = 'export const value = 1;';

    nativeHooks.chunkGraph.call({ chunks: [], entrypoints: [] });
    nativeHooks.moduleGraph.call({
      modules: [
        createNativeModule({
          ukey: 1,
          identifier: '/src/index.js',
          path: '/src/index.js',
        }),
      ],
      dependencies: [],
      chunkModules: [],
      connectionsOnlyImports: [],
    });
    nativeHooks.moduleSources.call({
      moduleOriginalSources: [{ module: 1, source, size: source.length }],
      jsonModuleSizes: [],
    });

    await doneHook.promise({});
    expect(modulesGraph.getModuleById(1)?.getSize().gzipSize).toBeGreaterThan(
      0,
    );

    compiler.watchMode = true;
    await doneHook.promise({});
    expect(modulesGraph.getModuleById(1)?.getSize().gzipSize).toBe(0);
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
