import { SDK } from '@rsdoctor/types';

let id = 1;
export class EntryPoint implements SDK.EntryPointInstance {
  static init() {
    id = 1;
  }

  constructor(public readonly name: string) {
    this.id = id++;
  }

  id: number;
  private _chunks: SDK.ChunkInstance[] = [];
  private _assets: SDK.AssetInstance[] = [];
  public addChunk(chunk: SDK.ChunkInstance): void {
    if (this._chunks.includes(chunk)) return;
    this._chunks.push(chunk);
  }

  public addAsset(asset: SDK.AssetInstance): void {
    if (this._assets.includes(asset)) return;
    this._assets.push(asset);
  }

  public toData(): SDK.EntryPointData {
    return {
      id: this.id,
      name: this.name,
      chunks: this._chunks.map((e) => e.id),
      assets: this._assets.map((e) => e.path),
      size: this._assets.length
        ? this._assets.reduce((t, e) => t + e.size, 0)
        : 0,
    };
  }

  setChunks(chunks: SDK.ChunkInstance[]) {
    this._chunks = chunks;
  }

  setAssets(assets: SDK.AssetInstance[]) {
    this._assets = assets;
  }

  setId(id: number): void {
    this.id = id;
  }
}
