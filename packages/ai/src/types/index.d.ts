export interface Chunk {
  id: string;
  name: string;
  initial: boolean;
  size: number;
  parsedSize: number;
  entry: boolean;
  assets: string[];
  modules: number[];
  dependencies: string[];
  imported: string[];
}

export interface Size {
  sourceSize: number;
  transformedSize: number;
  parsedSize: number;
}

interface FilteredModule {
  id: number;
  webpackId: string;
  path: string;
  size: Size;
  chunks: string[];
  kind: number;
}

export interface SimpleChunk {
  id: string;
  name: string;
  size: number;
  modules: SimpleModule[];
}
export interface SimpleModule {
  id: number;
  sourceSize: number;
  path: string;
}
