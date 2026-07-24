import { gzipSync } from 'node:zlib';
import { describe, expect, it, rs } from '@rstest/core';
import type { SDK } from '../src/types';
import { getAssetsModulesData } from '../src/graph/transform/chunks/assetsModules';

describe('getAssetsModulesData', () => {
  it('only collects module data from source maps', async () => {
    const code = 'export const value = 1;';
    const setSize = rs.fn();
    const setSource = rs.fn();
    const parseBundle = rs.fn();
    const moduleGraph = {
      getModuleByFile: rs.fn(() => [{ setSize, setSource }]),
      getModules: rs.fn(() => []),
    } as unknown as SDK.ModuleGraphInstance;
    const chunkGraph = {
      getAssets: rs.fn(() => [{ path: 'bundle.js' }]),
    } as unknown as SDK.ChunkGraphInstance;

    await getAssetsModulesData(
      moduleGraph,
      chunkGraph,
      '/dist',
      { parseBundle },
      new Map([['src/index.ts', code]]),
      new Set(['bundle.js']),
    );

    expect(moduleGraph.getModuleByFile).toHaveBeenCalledWith('src/index.ts');
    expect(setSize).toHaveBeenCalledWith({
      parsedSize: code.length,
      gzipSize: gzipSync(code, { level: 9 }).length,
    });
    expect(setSource).toHaveBeenCalledWith({ parsedSource: code });
    expect(parseBundle).not.toHaveBeenCalled();
    expect(chunkGraph.getAssets).not.toHaveBeenCalled();
    expect(moduleGraph.getModules).not.toHaveBeenCalled();
  });
});
