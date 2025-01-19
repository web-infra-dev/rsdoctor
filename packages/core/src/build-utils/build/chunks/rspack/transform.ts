import { Asset, Chunk, EntryPoint } from '@rsdoctor/graph';
import { Plugin, SDK } from '@rsdoctor/types';

/**
 * Patch native chunk graph data from Rspack into ChunkGraph instance
 * @param cg The ChunkGraph instance to be patched
 * @param rawChunkGraph Raw chunk graph data from Rspack native plugin
 */
export function patchNativeChunkGraph(
  cg: SDK.ChunkGraphInstance,
  rawChunkGraph: Plugin.RspackNativeChunkGraph,
) {
  const { chunks: rawChunks, entrypoints: rawEntrypoints } = rawChunkGraph;
  /** set chunks */
  const chunks = rawChunks.map(
    (chunk) =>
      new Chunk(
        chunk.ukey.toString(),
        chunk.name,
        0,
        chunk.initial,
        chunk.entry,
      ),
  );
  cg.setChunks(chunks);
  /** set entrypoints */
  const entrypoints = rawEntrypoints.map((entrypoint) => {
    const res = new EntryPoint(entrypoint.name);
    res.setId(entrypoint.ukey);
    return res;
  });
  cg.setEntrypoints(entrypoints);
  /** set chunk dependencies */
  for (const rawChunk of rawChunks) {
    const chunk = cg.getChunkById(rawChunk.ukey.toString())!;
    chunk.setDependencies(
      rawChunk.dependencies.map((ukey) => cg.getChunkById(ukey.toString())!),
    );
    chunk.setImported(
      rawChunk.imported.map((ukey) => cg.getChunkById(ukey.toString())!),
    );
  }
  /** set entrypoint dependencies */
  for (const rawEntrypoint of rawEntrypoints) {
    const entrypoint = cg.getEntryPointById(rawEntrypoint.ukey)!;
    entrypoint.setChunks(
      rawEntrypoint.chunks.map((ukey) => cg.getChunkById(ukey.toString())!),
    );
  }
}

/**
 * Patch native assets data from Rspack into ChunkGraph instance
 * @param cg The ChunkGraph instance to be patched
 * @param rawAssetPatch Raw assets patch data from Rspack native plugin
 */
export function patchNativeAssets(
  cg: SDK.ChunkGraphInstance,
  rawAssetPatch: Plugin.RspackNativeAssetPatch,
) {
  const {
    assets: rawAssets,
    chunkAssets: rawChunkAssets,
    entrypointAssets: rawEntrypointAssets,
  } = rawAssetPatch;

  /** set assets */
  const assets = rawAssets.map((asset) => {
    const res = new Asset(asset.path, asset.size, [], '');
    res.setId(asset.ukey);
    return res;
  });
  cg.setAssets(assets);
  /** set assets chunks */
  for (const rawAsset of rawAssets) {
    const asset = cg.getAssetById(rawAsset.ukey)!;
    asset.setChunks(
      rawAsset.chunks.map((ukey) => cg.getChunkById(ukey.toString())!),
    );
  }

  /** set chunk assets */
  for (const rawChunkAsset of rawChunkAssets) {
    const chunk = cg.getChunkById(rawChunkAsset.chunk.toString())!;
    chunk.setAssets(rawChunkAsset.assets.map((ukey) => cg.getAssetById(ukey)!));
  }
  /** set assets entrypoints */
  for (const rawEntrypointAsset of rawEntrypointAssets) {
    const entrypoint = cg.getEntryPointById(rawEntrypointAsset.entrypoint)!;
    entrypoint.setAssets(
      rawEntrypointAsset.assets.map((ukey) => cg.getAssetById(ukey)!),
    );
  }
}
