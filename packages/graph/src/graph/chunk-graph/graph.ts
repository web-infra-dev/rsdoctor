import { SDK } from '@rsdoctor/types';

export class ChunkGraph implements SDK.ChunkGraphInstance {
  private _assets: SDK.AssetInstance[] = [];
  private _chunks: SDK.ChunkInstance[] = [];
  private _entrypoints: SDK.EntryPointInstance[] = [];
  private _assetMap: Record<string, SDK.AssetInstance> = {};
  private _chunkMap: Record<string, SDK.ChunkInstance> = {};
  private _entrypointMap: Record<string, SDK.EntryPointInstance> = {};

  getAssets(): SDK.AssetInstance[] {
    return this._assets.slice();
  }

  getChunks(): SDK.ChunkInstance[] {
    return this._chunks.slice();
  }

  addAsset(...assets: SDK.AssetInstance[]): void {
    assets.forEach((asset) => {
      if (!this._assets.includes(asset)) {
        this._assets.push(asset);
        this._assetMap[asset.path] = asset;
      }
    });
  }

  addChunk(...chunks: SDK.ChunkInstance[]): void {
    chunks.forEach((chunk) => {
      if (!this._chunks.includes(chunk)) {
        this._chunks.push(chunk);
        this._chunkMap[chunk.id] = chunk;
      }
    });
  }

  getChunkById(id: string): SDK.ChunkInstance | undefined {
    return this._chunkMap[id];
  }

  getChunkByModule(module: SDK.ModuleInstance): SDK.ChunkInstance | undefined {
    return this._chunks.find((item) => item.hasModule(module));
  }

  getAssetByPath(path: string): SDK.AssetInstance | undefined {
    return this._assetMap[path];
  }

  getEntryPoints(): SDK.EntryPointInstance[] {
    return this._entrypoints.slice();
  }

  getEntryPointByName(name: string): SDK.EntryPointInstance | undefined {
    return this._entrypointMap[name];
  }

  addEntryPoint(...entrypoints: SDK.EntryPointInstance[]): void {
    entrypoints.forEach((entrypoint) => {
      if (!this._entrypoints.includes(entrypoint)) {
        this._entrypoints.push(entrypoint);
        this._entrypointMap[entrypoint.name] = entrypoint;
      }
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
