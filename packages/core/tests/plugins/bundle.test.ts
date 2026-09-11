import { SyncHook } from '@rspack/lite-tapable';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { describe, expect, it, rs } from 'rstack/test';
import { Asset, ChunkGraph } from '@rsdoctor/shared/graph';
import { Manifest, SDK, type Plugin } from '@rsdoctor/shared/types';
import { InternalBundlePlugin } from '@/inner-plugins/plugins/bundle';

const source = 'export const value = 1;';

function createHarness(
  content: string | Buffer = source,
  filename = 'index.js',
) {
  const chunkGraph = new ChunkGraph();
  const asset = new Asset(filename, 0, [], '');
  chunkGraph.addAsset(asset);

  const plugin = new InternalBundlePlugin({
    chunkGraph,
    options: {
      features: { treeShaking: false },
      output: { mode: 'normal' },
      supports: {
        gzip: { gzipLevel: 9 },
        brotli: { brotliLevel: 6 },
      },
    },
    sdk: {
      addClientRoutes: rs.fn(),
    },
  } as any);
  plugin.map.set(filename, { content });

  return { asset, plugin };
}

describe('InternalBundlePlugin', () => {
  it.each([
    { treeShaking: true, mode: 'normal', enabled: true },
    { treeShaking: false, mode: 'normal', enabled: false },
    { treeShaking: true, mode: 'lite', enabled: true },
    { treeShaking: true, mode: 'brief', enabled: false },
  ] as const)(
    'registers Tree Shaking with treeShaking=$treeShaking in $mode mode: $enabled',
    async ({ treeShaking, mode, enabled }) => {
      const { plugin } = createHarness();
      plugin.options.features.treeShaking = treeShaking;
      plugin.options.output.mode = mode;

      await plugin.done({ watchMode: false } as Plugin.BaseCompiler);

      const assertion = expect(plugin.sdk.addClientRoutes);
      (enabled ? assertion : assertion.not).toHaveBeenCalledWith([
        Manifest.RsdoctorManifestClientRoutes.TreeShaking,
      ]);
    },
  );

  it.each([
    {
      compiler: { watchMode: true },
      expectedGzipSize: undefined,
      mode: 'watch compiler',
    },
    {
      compiler: { watchMode: false },
      expectedGzipSize: gzipSync(source, { level: 9 }).length,
      mode: 'one-time compiler',
    },
    {
      compiler: {
        watchMode: false,
        parentCompilation: { compiler: { watchMode: true } },
      },
      expectedGzipSize: undefined,
      mode: 'child of a watch compiler',
    },
  ])(
    'calculates asset gzip sizes for a $mode',
    async ({ compiler, expectedGzipSize }) => {
      const { asset, plugin } = createHarness();

      await plugin.done(compiler as unknown as Plugin.BaseCompiler);

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

describe('asset compression input', () => {
  const binary = Buffer.from([0, 97, 115, 109, 1, 0, 0, 0, 255, 128, 192, 254]);

  it.each([
    { filename: 'module.wasm', content: binary },
    { filename: 'index.js', content: 'export const greeting = "你好 🌍";' },
  ])(
    'compresses the original bytes of $filename',
    async ({ filename, content }) => {
      const { asset, plugin } = createHarness(content, filename);
      const afterProcessAssets = new SyncHook(['assets']);
      plugin.map.clear();
      plugin.thisCompilation({
        hooks: { processAssets: {}, afterProcessAssets },
      } as unknown as Plugin.BaseCompilation);
      afterProcessAssets.call({ [filename]: { source: () => content } });

      expect(plugin.map.get(filename)?.content).toBe(content);
      await plugin.done({ watchMode: false } as Plugin.BaseCompiler);

      expect(asset.brotliSize).toBe(
        brotliCompressSync(content, {
          params: { [constants.BROTLI_PARAM_QUALITY]: 6 },
        }).length,
      );
      expect(asset.gzipSize).toBe(gzipSync(content, { level: 9 }).length);
      expect(asset.size).toBe(Buffer.byteLength(content));
      // Report content remains JSON-compatible text; only compression uses raw bytes.
      expect(asset.toData(SDK.ToDataType.Normal).content).toBe(
        content.toString(),
      );
      if (Buffer.isBuffer(content)) {
        expect(asset.brotliSize).not.toBe(
          brotliCompressSync(content.toString(), {
            params: { [constants.BROTLI_PARAM_QUALITY]: 6 },
          }).length,
        );
      }
    },
  );
});
