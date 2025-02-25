import { SDK } from '@rsdoctor/types';

export class ChunkGraph implements SDK.ChunkGraphInstance {
  private _assetMap: Map<number, SDK.AssetInstance> = new Map();
  private _assetPathMap: Map<string, SDK.AssetInstance> = new Map();
  private _chunkMap: Map<string, SDK.ChunkInstance> = new Map();
  private _entrypointMap: Map<number, SDK.EntryPointInstance> = new Map();

  getAssets(): SDK.AssetInstance[] {
    return Array.from(this._assetMap.values());
  }

  getChunks(): SDK.ChunkInstance[] {
    return Array.from(this._chunkMap.values());
  }

  addAsset(...assets: SDK.AssetInstance[]): void {
    assets.forEach((asset) => {
      this._assetMap.set(asset.id, asset);
      this._assetPathMap.set(asset.path, asset);
    });
  }

  addChunk(...chunks: SDK.ChunkInstance[]): void {
    chunks.forEach((chunk) => {
      this._chunkMap.set(chunk.id, chunk);
    });
  }

  getChunkById(id: string): SDK.ChunkInstance | undefined {
    return this._chunkMap.get(id);
  }

  getAssetByPath(path: string): SDK.AssetInstance | undefined {
    return this._assetPathMap.get(path);
  }

  getAssetById(id: number): SDK.AssetInstance | undefined {
    return this._assetMap.get(id);
  }

  getEntryPoints(): SDK.EntryPointInstance[] {
    return Array.from(this._entrypointMap.values());
  }

  getEntryPointById(id: number): SDK.EntryPointInstance | undefined {
    return this._entrypointMap.get(id);
  }

  addEntryPoint(...entrypoints: SDK.EntryPointInstance[]): void {
    entrypoints.forEach((entrypoint) => {
      this._entrypointMap.set(entrypoint.id, entrypoint);
    });
  }

  /** output the chunk graph data */
  toData(type: SDK.ToDataType): SDK.ChunkGraphData {
    return {
      assets: Array.from(this._assetMap.values()).map((item) =>
        item.toData(type),
      ),
      chunks: Array.from(this._chunkMap.values()).map((item) => item.toData()),
      entrypoints: Array.from(this._entrypointMap.values()).map((item) =>
        item.toData(),
      ),
    };
  }

  setChunks(chunks: SDK.ChunkInstance[]) {
    this._chunkMap = new Map(chunks.map((item) => [item.id, item]));
  }

  setEntrypoints(entrypoints: SDK.EntryPointInstance[]) {
    this._entrypointMap = new Map(entrypoints.map((item) => [item.id, item]));
  }

  setAssets(assets: SDK.AssetInstance[]) {
    this._assetMap = new Map(assets.map((item) => [item.id, item]));
    this._assetPathMap = new Map(assets.map((item) => [item.path, item]));
  }
}
