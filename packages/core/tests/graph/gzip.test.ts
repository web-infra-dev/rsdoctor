import { gzipSync } from 'node:zlib';
import { describe, expect, it } from '@rstest/core';
import {
  Asset,
  ChunkGraph,
  Chunks,
  Module,
  ModuleGraph,
} from '@rsdoctor/graph';
import { normalizeUserConfig } from '../../src/inner-plugins/utils/config';

const source = `
  export const values = [${Array.from({ length: 1_000 }, (_, index) => index % 17).join(',')}];
  export function read(index) {
    return values[index % values.length];
  }
`;

function createModuleGraph() {
  const moduleGraph = new ModuleGraph();
  const module = new Module('/src/index.js', '/src/index.js');
  moduleGraph.addModule(module);
  return { module, moduleGraph };
}

describe('gzip size collection', () => {
  it('uses the normalized default gzip level for assets', () => {
    const chunkGraph = new ChunkGraph();
    const asset = new Asset('index.js', source.length, [], '');
    chunkGraph.addAsset(asset);

    const gzip = normalizeUserConfig({
      supports: { gzip: true },
    }).supports.gzip;

    Chunks.assetsContents(
      new Map([['index.js', { content: source }]]),
      chunkGraph,
      gzip,
    );

    expect(asset.gzipSize).toBe(gzipSync(source, { level: 6 }).length);
  });

  it('uses the configured gzip level for assets', () => {
    const chunkGraph = new ChunkGraph();
    const asset = new Asset('index.js', source.length, [], '');
    chunkGraph.addAsset(asset);

    const gzip = normalizeUserConfig({
      supports: { gzip: { gzipLevel: 1 } },
    }).supports.gzip;

    Chunks.assetsContents(
      new Map([['index.js', { content: source }]]),
      chunkGraph,
      gzip,
    );

    expect(asset.gzipSize).toBe(gzipSync(source, { level: 1 }).length);
  });

  it('does not calculate asset gzip sizes when gzip support is disabled', () => {
    const chunkGraph = new ChunkGraph();
    const asset = new Asset('index.js', source.length, [], '');
    chunkGraph.addAsset(asset);

    const gzip = normalizeUserConfig({
      supports: { gzip: false },
    }).supports.gzip;

    Chunks.assetsContents(
      new Map([['index.js', { content: source }]]),
      chunkGraph,
      gzip,
    );

    expect(asset.gzipSize).toBeUndefined();
  });

  it('uses the configured gzip level for source map modules', async () => {
    const { module, moduleGraph } = createModuleGraph();

    await Chunks.getAssetsModulesData(
      moduleGraph,
      new ChunkGraph(),
      '',
      { gzip: true, gzipLevel: 1 },
      new Map([['/src/index.js', source]]),
    );

    expect(module.getSize().gzipSize).toBe(
      gzipSync(source, { level: 1 }).length,
    );
  });

  it('uses the configured gzip level for AST-parsed modules', () => {
    const { module, moduleGraph } = createModuleGraph();

    Chunks.transformAssetsModulesData(
      {
        '/src/index.js': {
          size: source.length,
          sizeConvert: String(source.length),
          content: source,
        },
      },
      moduleGraph,
      { gzip: true, gzipLevel: 1 },
    );

    expect(module.getSize().gzipSize).toBe(
      gzipSync(source, { level: 1 }).length,
    );
  });

  it('uses module source as a gzip fallback', async () => {
    const { module, moduleGraph } = createModuleGraph();
    module.setSource({ source });

    await Chunks.getAssetsModulesData(moduleGraph, new ChunkGraph(), '', {
      gzip: true,
      gzipLevel: 1,
    });

    expect(module.getSize().gzipSize).toBe(
      gzipSync(source, { level: 1 }).length,
    );
  });

  it('does not calculate module gzip sizes when gzip support is disabled', async () => {
    const { module, moduleGraph } = createModuleGraph();
    module.setSource({ source });

    await Chunks.getAssetsModulesData(
      moduleGraph,
      new ChunkGraph(),
      '',
      { gzip: false, gzipLevel: 1 },
      new Map([['/src/index.js', source]]),
    );

    expect(module.getSize().parsedSize).toBe(source.length);
    expect(module.getSize().gzipSize).toBe(0);
  });
});
