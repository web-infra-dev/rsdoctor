import { SDK } from '@rsdoctor/types';

export class ChunkGraph implements SDK.ChunkGraphInstance {
  private _assetMap: Map<string, SDK.AssetInstance> = new Map();
  private _chunkMap: Map<string, SDK.ChunkInstance> = new Map();
  private _entrypointMap: Map<string, SDK.EntryPointInstance> = new Map();

  getAssets(): SDK.AssetInstance[] {
    return Array.from(this._assetMap.values());
  }

  getChunks(): SDK.ChunkInstance[] {
    return Array.from(this._chunkMap.values());
  }

  addAsset(...assets: SDK.AssetInstance[]): void {
    assets.forEach((asset) => {
      this._assetMap.set(asset.path, asset);
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

  getChunkByModule(module: SDK.ModuleInstance): SDK.ChunkInstance | undefined {
    return Array.from(this._chunkMap.values()).find((item) =>
      item.hasModule(module),
    );
  }

  getAssetByPath(path: string): SDK.AssetInstance | undefined {
    return this._assetMap.get(path);
  }

  getEntryPoints(): SDK.EntryPointInstance[] {
    return Array.from(this._entrypointMap.values());
  }

  getEntryPointByName(name: string): SDK.EntryPointInstance | undefined {
    return this._entrypointMap.get(name);
  }

  addEntryPoint(...entrypoints: SDK.EntryPointInstance[]): void {
    entrypoints.forEach((entrypoint) => {
      this._entrypointMap.set(entrypoint.name, entrypoint);
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
}
