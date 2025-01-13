import { SDK } from '@rsdoctor/types';

export class EntryPoint implements SDK.EntryPointInstance {
  private _chunks: SDK.ChunkInstance[] = [];
  private _assets: SDK.AssetInstance[] = [];

  constructor(public readonly name: string) {}

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
      name: this.name,
      chunks: this._chunks.map((e) => e.id),
      assets: this._assets.map((e) => e.path),
      size: this._assets.length
        ? this._assets.reduce((t, e) => t + e.size, 0)
        : 0,
    };
  }
}
