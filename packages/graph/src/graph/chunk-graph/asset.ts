import { SDK } from '@rsdoctor/types';

let id = 1;

export class Asset implements SDK.AssetInstance {
  static init() {
    id = 1;
  }

  id: number;
  path: string;
  size: number;
  content: string;
  chunks: SDK.ChunkInstance[];

  constructor(
    path: string,
    size: number,
    chunks: SDK.ChunkInstance[],
    content: string,
  ) {
    this.id = id++;
    this.path = path;
    this.size = size;
    this.chunks = chunks;
    this.content = content;
  }

  toData(types: SDK.ToDataType): SDK.AssetData {
    return {
      id: this.id,
      path: this.path,
      size: this.size,
      chunks: this.chunks?.map((ck) => ck.id),
      content:
        types === SDK.ToDataType.NoSourceAndAssets ||
        types === SDK.ToDataType.NoCode
          ? ''
          : this.content,
    };
  }

  /* native asset */
  setChunks(chunks: SDK.ChunkInstance[]) {
    this.chunks = chunks;
  }

  setId(id: number): void {
    this.id = id;
  }
}
