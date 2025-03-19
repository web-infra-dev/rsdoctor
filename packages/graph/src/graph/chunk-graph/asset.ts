import { SDK } from '@rsdoctor/types';
import { gzipSync } from 'node:zlib';
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
  gzipSize: number | undefined;

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
      gzipSize: this.gzipSize,
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

  setGzipSize(content: string) {
    this.gzipSize = gzipSync(content, { level: 9 }).length;
  }
}
