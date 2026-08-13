import { gzipSync } from 'node:zlib';
import { describe, expect, it, rs } from '@rstest/core';
import { Asset, ChunkGraph } from '@rsdoctor/shared/graph';
import type { Plugin } from '@rsdoctor/shared/types';
import { InternalBundlePlugin } from '@/inner-plugins/plugins/bundle';

const source = 'export const value = 1;';

function createHarness() {
  const chunkGraph = new ChunkGraph();
  const asset = new Asset('index.js', source.length, [], '');
  chunkGraph.addAsset(asset);

  const plugin = new InternalBundlePlugin({
    chunkGraph,
    options: {
      supports: {
        gzip: { gzipLevel: 9 },
      },
    },
    sdk: {
      addClientRoutes: rs.fn(),
    },
  } as any);
  plugin.map.set('index.js', { content: source });

  return { asset, plugin };
}

describe('InternalBundlePlugin', () => {
  it.each([
    { watchMode: true, expectedGzipSize: undefined },
    {
      watchMode: false,
      expectedGzipSize: gzipSync(source, { level: 9 }).length,
    },
  ])(
    'uses watchMode=$watchMode when calculating asset gzip sizes',
    async ({ watchMode, expectedGzipSize }) => {
      const { asset, plugin } = createHarness();

      await plugin.done({ watchMode } as Plugin.BaseCompiler);

      expect(asset.gzipSize).toBe(expectedGzipSize);
    },
  );

  it('clears asset gzip sizes when a compiler switches to watch mode', async () => {
    const { asset, plugin } = createHarness();
    const compiler = { watchMode: false } as Plugin.BaseCompiler;

    await plugin.done(compiler);
    expect(asset.gzipSize).toBeGreaterThan(0);

    compiler.watchMode = true;
    await plugin.done(compiler);
    expect(asset.gzipSize).toBeUndefined();
  });
});
