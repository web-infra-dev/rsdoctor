import { SDK } from '@rsdoctor/types';

export function getChunkIdsByAsset(asset: SDK.AssetData): string[] {
  if (asset.chunks) {
    return asset.chunks;
  }

  return [];
}

export function getChunksByModule(
  module: SDK.ModuleData,
  chunks: SDK.ChunkData[],
): SDK.ChunkData[] {
  if (module.chunks.length) {
    return getChunksByChunkIds(module.chunks, chunks);
  }
  return [];
}

export function getChunkByChunkId(
  chunkId: string,
  chunks: SDK.ChunkData[],
): SDK.ChunkData {
  return chunks.find((e) => e.id === chunkId)!;
}

export function getChunksByChunkIds(
  chunkIds: string[],
  chunks: SDK.ChunkData[],
  filters?: (keyof SDK.ChunkData)[],
): SDK.ChunkData[] {
  if (!chunkIds.length) return [];
  const result = chunkIds
    .map((id) => chunks.find((e) => e.id === id))
    .filter(Boolean)
    .map((chunk) => {
      if (filters && filters.length > 0) {
        const filtered: Record<string, any> = {};
        for (const key of filters) {
          if (chunk![key] !== undefined) {
            filtered[key] = chunk![key];
          }
        }
        return filtered;
      }
      return chunk!;
    });
  return result as SDK.ChunkData[];
}

export function getChunksByAsset(
  asset: SDK.AssetData,
  chunks: SDK.ChunkData[],
  filters?: (keyof SDK.ChunkData)[],
): SDK.ChunkData[] {
  return getChunksByChunkIds(getChunkIdsByAsset(asset), chunks, filters);
}

export function getChunksByModuleId(
  id: number,
  modules: SDK.ModuleData[],
  chunks: SDK.ChunkData[],
) {
  const mod = modules.find((e) => e.id === id);
  if (!mod) return [];
  return getChunksByModule(mod, chunks);
}
