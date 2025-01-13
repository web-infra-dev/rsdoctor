import { SDK } from '@rsdoctor/types';

export class Asset implements SDK.AssetInstance {
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
    this.path = path;
    this.size = size;
    this.chunks = chunks;
    this.content = content;
  }

  toData(types: SDK.ToDataType): SDK.AssetData {
    return {
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
}
