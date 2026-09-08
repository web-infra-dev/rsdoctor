import { SDK } from '@rsdoctor/shared/types';
import { brotliCompressSync, constants } from 'node:zlib';
import { describe, expect, it } from 'rstack/test';
import {
  Asset,
  ChunkGraph,
  Chunks,
  Module,
  ModuleGraph,
} from '@rsdoctor/shared/graph';
import {
  normalizeUserConfig,
  getEffectiveCompressionConfig,
} from '../../src/inner-plugins/utils/config';

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

describe('brotli size collection', () => {
  it('uses the normalized default brotli level for assets', () => {
    const chunkGraph = new ChunkGraph();
    const asset = new Asset('index.js', source.length, [], '');
    chunkGraph.addAsset(asset);

    const brotli = normalizeUserConfig({
      supports: { brotli: true },
    }).supports.brotli;

    Chunks.assetsContents(
      new Map([['index.js', { content: source }]]),
      chunkGraph,
      false,
      brotli,
    );

    expect(asset.brotliSize).toBe(
      brotliCompressSync(source, {
        params: { [constants.BROTLI_PARAM_QUALITY]: 6 },
      }).length,
    );
  });

  it('uses the configured brotli level for assets', () => {
    const chunkGraph = new ChunkGraph();
    const asset = new Asset('index.js', source.length, [], '');
    chunkGraph.addAsset(asset);

    const brotli = normalizeUserConfig({
      supports: { brotli: { brotliLevel: 1 } },
    }).supports.brotli;

    Chunks.assetsContents(
      new Map([['index.js', { content: source }]]),
      chunkGraph,
      false,
      brotli,
    );

    expect(asset.brotliSize).toBe(
      brotliCompressSync(source, {
        params: { [constants.BROTLI_PARAM_QUALITY]: 1 },
      }).length,
    );
  });

  it('does not calculate asset brotli sizes when brotli support is disabled', () => {
    const chunkGraph = new ChunkGraph();
    const asset = new Asset('index.js', source.length, [], '');
    chunkGraph.addAsset(asset);

    const brotli = normalizeUserConfig({
      supports: { brotli: false },
    }).supports.brotli;

    Chunks.assetsContents(
      new Map([['index.js', { content: source }]]),
      chunkGraph,
      false,
      brotli,
    );

    expect(asset.brotliSize).toBeUndefined();
  });

  it('uses the configured brotli level for source map modules', async () => {
    const { module, moduleGraph } = createModuleGraph();

    await Chunks.getAssetsModulesData(
      moduleGraph,
      new ChunkGraph(),
      '',
      { brotli: true, brotliLevel: 1 },
      new Map([['/src/index.js', source]]),
    );

    expect(module.getSize().brotliSize).toBe(
      brotliCompressSync(source, {
        params: { [constants.BROTLI_PARAM_QUALITY]: 1 },
      }).length,
    );
  });

  it('uses the configured brotli level for AST-parsed modules', () => {
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
      { brotli: true, brotliLevel: 1 },
    );

    expect(module.getSize().brotliSize).toBe(
      brotliCompressSync(source, {
        params: { [constants.BROTLI_PARAM_QUALITY]: 1 },
      }).length,
    );
  });

  it('uses module source as a brotli fallback', async () => {
    const { module, moduleGraph } = createModuleGraph();
    module.setSource({ source });

    await Chunks.getAssetsModulesData(moduleGraph, new ChunkGraph(), '', {
      brotli: true,
      brotliLevel: 1,
    });

    expect(module.getSize().brotliSize).toBe(
      brotliCompressSync(source, {
        params: { [constants.BROTLI_PARAM_QUALITY]: 1 },
      }).length,
    );
  });

  it('does not calculate module brotli sizes when brotli support is disabled', async () => {
    const { module, moduleGraph } = createModuleGraph();
    module.setSource({ source });

    await Chunks.getAssetsModulesData(
      moduleGraph,
      new ChunkGraph(),
      '',
      { brotli: false, brotliLevel: 1 },
      new Map([['/src/index.js', source]]),
    );

    expect(module.getSize().parsedSize).toBe(source.length);
    expect(module.getSize().brotliSize).toBeUndefined();
  });
});

describe('Brotli collection boundaries', () => {
  it.each([0, 6, 11])(
    'collects asset bytes at quality %s and serializes them without source',
    (brotliLevel) => {
      const graph = new ChunkGraph();
      const asset = new Asset('index.js', 0, [], '');
      const image = new Asset('image.png', 0, [], '');
      graph.addAsset(asset);
      graph.addAsset(image);
      const content = '你好 🌍'.repeat(30);
      Chunks.assetsContents(
        new Map([
          ['index.js', { content }],
          ['image.png', { content }],
        ]),
        graph,
        false,
        { brotliLevel },
      );
      expect(asset.brotliSize).toBe(
        brotliCompressSync(content, {
          params: { [constants.BROTLI_PARAM_QUALITY]: brotliLevel },
        }).length,
      );
      expect(asset.gzipSize).toBeUndefined();
      expect(image.brotliSize).toBeUndefined();
      expect(asset.toData(SDK.ToDataType.NoCode)).toMatchObject({
        brotliSize: asset.brotliSize,
        content: '',
      });
      Chunks.assetsContents(new Map(), graph, false, false);
      expect(asset.brotliSize).toBeUndefined();
    },
  );

  it('clears module Brotli sizes when disabled after collection', async () => {
    const { module, moduleGraph } = createModuleGraph();
    module.setSource({ source });
    await Chunks.getAssetsModulesData(moduleGraph, new ChunkGraph(), '', {
      gzip: false,
      brotli: true,
    });
    expect(module.getSize().brotliSize).toBeGreaterThan(0);
    expect(module.getSize().gzipSize).toBe(0);
    await Chunks.getAssetsModulesData(moduleGraph, new ChunkGraph(), '', {
      gzip: false,
      brotli: false,
    });
    expect(module.getSize().brotliSize).toBeUndefined();
  });

  it('disables Brotli for watch and child compilers', () => {
    const brotli = { brotliLevel: 6 };
    expect(getEffectiveCompressionConfig({ watchMode: true }, brotli)).toBe(
      false,
    );
    expect(
      getEffectiveCompressionConfig(
        { parentCompilation: { compiler: { watchMode: true } } } as never,
        brotli,
      ),
    ).toBe(false);
    expect(getEffectiveCompressionConfig({ watchMode: false }, brotli)).toEqual(
      brotli,
    );
  });
});
