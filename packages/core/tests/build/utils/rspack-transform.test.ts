import { describe, it, expect } from '@rstest/core';
import { ModuleGraph, ChunkGraph, Chunk } from '@rsdoctor/core/graph';
import {
  extractSideEffectCodes,
  patchNativeModuleGraph,
  patchNativeModuleSources,
} from '@/build-utils/build/module-graph/rspack/transform';
import type { Plugin } from '@rsdoctor/shared/types';

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

describe('Rspack native module graph transform', () => {
  it('should process bailoutReason from Rspack native plugin', () => {
    const moduleGraph = new ModuleGraph();
    const chunkGraph = new ChunkGraph();

    // Create a mock chunk
    const chunk = new Chunk('1', 'main', 0, false, false);
    chunkGraph.addChunk(chunk);

    // Create mock Rspack native module graph data
    const rawModuleGraph: Plugin.RspackNativeModuleGraph = {
      modules: [
        createNativeModule({
          ukey: 1,
          identifier: '/path/to/module1.js',
          path: '/path/to/module1.js',
          chunks: [1],
          bailoutReason: [
            'Statement with side_effects in source code at module1.js:5:1-10',
            'ModuleConcatenation bailout: Module is not an ECMAScript module',
          ],
        }),
        createNativeModule({
          ukey: 2,
          identifier: '/path/to/module2.js',
          path: '/path/to/module2.js',
          chunks: [1],
          bailoutReason: [
            'Statement with side_effects in source code at module2.js:3:1-8',
          ],
        }),
        createNativeModule({
          ukey: 3,
          identifier: '/path/to/module3.js',
          path: '/path/to/module3.js',
          chunks: [1],
        }),
      ],
      dependencies: [],
      chunkModules: [
        {
          chunk: 1,
          modules: [1, 2, 3],
        },
      ],
      connectionsOnlyImports: [],
    };

    // Apply the transform
    patchNativeModuleGraph(moduleGraph, chunkGraph, rawModuleGraph);

    // Verify bailoutReason was processed correctly
    const module1 = moduleGraph.getModuleById(1);
    expect(module1).toBeTruthy();
    expect(module1?.getBailoutReason()).toEqual([
      'Statement with side_effects in source code at module1.js:5:1-10',
    ]);
    // ModuleConcatenation bailout should be filtered out
    expect(module1?.getBailoutReason()).not.toContain(
      'ModuleConcatenation bailout: Module is not an ECMAScript module',
    );

    const module2 = moduleGraph.getModuleById(2);
    expect(module2).toBeTruthy();
    expect(module2?.getBailoutReason()).toEqual([
      'Statement with side_effects in source code at module2.js:3:1-8',
    ]);

    const module3 = moduleGraph.getModuleById(3);
    expect(module3).toBeTruthy();
    expect(module3?.getBailoutReason()).toEqual([]);
  });

  it('should filter out ModuleConcatenation bailout reasons', () => {
    const moduleGraph = new ModuleGraph();
    const chunkGraph = new ChunkGraph();

    const chunk = new Chunk('1', 'main', 0, false, false);
    chunkGraph.addChunk(chunk);

    const rawModuleGraph: Plugin.RspackNativeModuleGraph = {
      modules: [
        createNativeModule({
          ukey: 1,
          identifier: '/path/to/module.js',
          path: '/path/to/module.js',
          chunks: [1],
          bailoutReason: [
            'ModuleConcatenation bailout: Module is not an ECMAScript module',
            'ModuleConcatenation bailout: Module is an entry point',
            'Statement with side_effects in source code at module.js:1:1-5',
          ],
        }),
      ],
      dependencies: [],
      chunkModules: [
        {
          chunk: 1,
          modules: [1],
        },
      ],
      connectionsOnlyImports: [],
    };

    patchNativeModuleGraph(moduleGraph, chunkGraph, rawModuleGraph);

    const module = moduleGraph.getModuleById(1);
    expect(module).toBeTruthy();
    const bailoutReasons = module?.getBailoutReason() || [];
    expect(bailoutReasons).toEqual([
      'Statement with side_effects in source code at module.js:1:1-5',
    ]);
    // All ModuleConcatenation bailout reasons should be filtered out
    expect(bailoutReasons).not.toContain(
      'ModuleConcatenation bailout: Module is not an ECMAScript module',
    );
    expect(bailoutReasons).not.toContain(
      'ModuleConcatenation bailout: Module is an entry point',
    );
  });

  it('should handle modules without bailoutReason', () => {
    const moduleGraph = new ModuleGraph();
    const chunkGraph = new ChunkGraph();

    const chunk = new Chunk('1', 'main', 0, false, false);
    chunkGraph.addChunk(chunk);

    const rawModuleGraph: Plugin.RspackNativeModuleGraph = {
      modules: [
        createNativeModule({
          ukey: 1,
          identifier: '/path/to/module.js',
          path: '/path/to/module.js',
          chunks: [1],
        }),
      ],
      dependencies: [],
      chunkModules: [
        {
          chunk: 1,
          modules: [1],
        },
      ],
      connectionsOnlyImports: [],
    };

    patchNativeModuleGraph(moduleGraph, chunkGraph, rawModuleGraph);

    const module = moduleGraph.getModuleById(1);
    expect(module).toBeTruthy();
    expect(module?.getBailoutReason()).toEqual([]);
  });

  it('should extract side effect code snippets from module sources', () => {
    const moduleGraph = new ModuleGraph();
    const chunkGraph = new ChunkGraph();

    const chunk = new Chunk('1', 'main', 0, false, false);
    chunkGraph.addChunk(chunk);

    const rawModuleGraph: Plugin.RspackNativeModuleGraph = {
      modules: [
        createNativeModule({
          ukey: 1,
          identifier: '/path/to/module.js',
          path: '/path/to/module.js',
          chunks: [1],
          sideEffectsLocations: [
            {
              location: '1:1-8',
              nodeType: 'ExpressionStatement',
              module: 1,
              request: './module',
            },
            {
              location: '2:1-9',
              nodeType: 'ExpressionStatement',
              module: 1,
              request: './module',
            },
          ],
        }),
      ],
      dependencies: [],
      chunkModules: [
        {
          chunk: 1,
          modules: [1],
        },
      ],
      connectionsOnlyImports: [],
    };

    patchNativeModuleGraph(moduleGraph, chunkGraph, rawModuleGraph);
    patchNativeModuleSources(moduleGraph, {
      moduleOriginalSources: [
        {
          module: 1,
          source: 'first();\nsecond();',
          size: 17,
        },
      ],
      jsonModuleSizes: [],
    });
    extractSideEffectCodes(moduleGraph);

    const module = moduleGraph.getModuleById(1);
    expect(module?.getSideEffectCodes()).toEqual([
      {
        moduleId: 1,
        startLine: 1,
        code: 'first();',
      },
      {
        moduleId: 1,
        startLine: 2,
        code: 'second();',
      },
    ]);
  });
});
