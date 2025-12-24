import { describe, it, expect, beforeEach } from '@rstest/core';
import { getAssetsModulesData } from '../../../src/transform/chunks/assetsModules';
import { SDK } from '@rsdoctor/types';

describe('assetsModules - asset no map integration', () => {
  let mockModuleGraph: SDK.ModuleGraphInstance;
  let mockChunkGraph: SDK.ChunkGraphInstance;

  beforeEach(() => {
    // Create mock module graph
    mockModuleGraph = {
      getModuleByFile: (filePath: string) => {
        // Return mock modules
        return [
          {
            setSize: () => {},
            setSource: () => {},
          },
        ];
      },
      getModules: () => [],
      getModuleByWebpackId: (id: string) => {
        return {
          setSize: () => {},
          setSource: () => {},
        };
      },
    } as any;

    // Create mock chunk graph
    mockChunkGraph = {
      getAssets: () => [],
    } as any;
  });

  it('should use AST parsing when assetsWithoutSourceMap is provided', async () => {
    const assetsWithoutSourceMap = new Set(['bundle.js', 'vendor.js']);
    const sourceMapSets = new Map([
      ['src/index.js', 'console.log("with map");'],
    ]);

    let parseBundleCalled = false;
    // Mock parseBundle function
    const parseBundle = (assetFile: string) => {
      parseBundleCalled = true;
      return {
        modules: {
          'module-1': {
            size: 100,
            sizeConvert: '100 B',
            content: 'parsed content',
          },
        },
      };
    };

    // Set up mock assets
    mockChunkGraph.getAssets = () =>
      [{ path: 'bundle.js' }, { path: 'vendor.js' }] as any;

    await getAssetsModulesData(
      mockModuleGraph,
      mockChunkGraph,
      '/fake/bundle/dir',
      { parseBundle },
      sourceMapSets,
      assetsWithoutSourceMap,
    );

    // parseBundle should be called for assets without sourcemap
    expect(parseBundleCalled).toBe(true);
  });

  it('should use AST parsing as fallback when no sourcemap exists at all', async () => {
    const sourceMapSets = new Map(); // Empty - no sourcemaps
    let parseBundleCalled = false;
    const parseBundle = () => {
      parseBundleCalled = true;
      return { modules: {} };
    };

    mockChunkGraph.getAssets = () => [{ path: 'bundle.js' }] as any;

    await getAssetsModulesData(
      mockModuleGraph,
      mockChunkGraph,
      '/fake/bundle/dir',
      { parseBundle },
      sourceMapSets,
      undefined, // No assetsWithoutSourceMap
    );

    // parseBundle should be called as fallback
    expect(parseBundleCalled).toBe(true);
  });

  it('should NOT use AST parsing when all assets have sourcemap', async () => {
    const sourceMapSets = new Map([
      ['src/index.js', 'console.log("code1");'],
      ['src/app.js', 'console.log("code2");'],
    ]);
    const assetsWithoutSourceMap = new Set(); // Empty - all assets have sourcemap
    let parseBundleCalled = false;
    const parseBundle = () => {
      parseBundleCalled = true;
      return { modules: {} };
    };

    mockChunkGraph.getAssets = () => [{ path: 'bundle.js' }] as any;

    await getAssetsModulesData(
      mockModuleGraph,
      mockChunkGraph,
      '/fake/bundle/dir',
      { parseBundle },
      sourceMapSets,
      assetsWithoutSourceMap,
    );

    // parseBundle should NOT be called when all assets have sourcemap
    expect(parseBundleCalled).toBe(false);
  });

  it('should only parse assets that are in assetsWithoutSourceMap', async () => {
    const assetsWithoutSourceMap = new Set(['no-map.js']); // Only this one has no map
    const sourceMapSets = new Map([
      ['src/index.js', 'console.log("with map");'],
    ]);
    let parseCount = 0;
    const parsedAssets: string[] = [];

    const parseBundle = (assetFile: string) => {
      parseCount++;
      parsedAssets.push(assetFile);
      return { modules: {} };
    };

    mockChunkGraph.getAssets = () =>
      [
        { path: 'with-map.js' }, // This one should be skipped
        { path: 'no-map.js' }, // This one should be parsed
      ] as any;

    await getAssetsModulesData(
      mockModuleGraph,
      mockChunkGraph,
      '/fake/bundle/dir',
      { parseBundle },
      sourceMapSets,
      assetsWithoutSourceMap,
    );

    // parseBundle should only be called once for no-map.js
    expect(parseCount).toBe(1);
    expect(parsedAssets[0]).toBe('/fake/bundle/dir/no-map.js');
  });

  it('should process sourcemap data for modules with sourcemap', async () => {
    const sourceMapSets = new Map([
      ['src/index.js', 'const x = 1;\nconsole.log(x);'],
      ['src/utils.js', 'export const util = () => {};'],
    ]);

    const moduleCalls: Array<{ file: string; size?: any; source?: any }> = [];

    mockModuleGraph.getModuleByFile = (filePath: string) => {
      return [
        {
          setSize: (data: any) => {
            moduleCalls.push({ file: filePath, size: data });
          },
          setSource: (data: any) => {
            moduleCalls.push({ file: filePath, source: data });
          },
        },
      ];
    };

    await getAssetsModulesData(
      mockModuleGraph,
      mockChunkGraph,
      '/fake/bundle/dir',
      {},
      sourceMapSets,
      new Set(), // Empty - all have sourcemap
    );

    // Verify setSize and setSource were called
    const indexCalls = moduleCalls.filter((c) => c.file === 'src/index.js');
    const utilsCalls = moduleCalls.filter((c) => c.file === 'src/utils.js');

    expect(indexCalls.length).toBeGreaterThan(0);
    expect(utilsCalls.length).toBeGreaterThan(0);

    // Check that size was set
    const indexSizeCall = indexCalls.find((c) => c.size);
    expect(indexSizeCall?.size.parsedSize).toBe(
      'const x = 1;\nconsole.log(x);'.length,
    );

    // Check that source was set
    const indexSourceCall = indexCalls.find((c) => c.source);
    expect(indexSourceCall?.source.parsedSource).toBe(
      'const x = 1;\nconsole.log(x);',
    );
  });

  it('should handle mixed scenario: some assets with sourcemap, some without', async () => {
    const sourceMapSets = new Map([
      ['src/withMap.js', 'console.log("has sourcemap");'],
    ]);
    const assetsWithoutSourceMap = new Set(['noMap.js']);

    let parseBundleCalled = false;
    const parseBundle = () => {
      parseBundleCalled = true;
      return {
        modules: {
          'noMap-module': {
            size: 50,
            sizeConvert: '50 B',
            content: 'parsed from AST',
          },
        },
      };
    };

    const sourceCalls: string[] = [];

    mockModuleGraph.getModuleByFile = (filePath: string) => {
      if (filePath === 'src/withMap.js') {
        return [
          {
            setSize: () => {},
            setSource: (data: any) => {
              sourceCalls.push(data.parsedSource);
            },
          },
        ];
      }
      return [];
    };

    mockChunkGraph.getAssets = () =>
      [{ path: 'withMap.js' }, { path: 'noMap.js' }] as any;

    await getAssetsModulesData(
      mockModuleGraph,
      mockChunkGraph,
      '/fake/bundle/dir',
      { parseBundle },
      sourceMapSets,
      assetsWithoutSourceMap,
    );

    // Module with sourcemap should use sourcemap data
    expect(sourceCalls).toContain('console.log("has sourcemap");');

    // Module without sourcemap should use AST parsing
    expect(parseBundleCalled).toBe(true);
  });

  it('should handle empty sourcemap content gracefully', async () => {
    const sourceMapSets = new Map([
      ['src/empty.js', ''], // Empty content
    ]);

    let sizeData: any = null;
    let sourceData: any = null;

    mockModuleGraph.getModuleByFile = () => [
      {
        setSize: (data: any) => {
          sizeData = data;
        },
        setSource: (data: any) => {
          sourceData = data;
        },
      },
    ];

    await getAssetsModulesData(
      mockModuleGraph,
      mockChunkGraph,
      '/fake/bundle/dir',
      {},
      sourceMapSets,
      new Set(),
    );

    // Should still call setSize with 0 length
    expect(sizeData).not.toBeNull();
    expect(sizeData.parsedSize).toBe(0);
    expect(sourceData).not.toBeNull();
    expect(sourceData.parsedSource).toBe('');
  });
});
