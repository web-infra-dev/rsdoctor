export interface ChunkGroupGraphChunkData {
  id: string;
  name: string;
  emittedSize: number;
  totalJSSize: number;
  moduleCount: number;
  files: string[];
}

export interface ChunkGroupGraphModuleData {
  id: string;
  name: string;
  resource: string | null;
  size: number;
}

export type ChunkGroupGraphPathSeverity = 'normal' | 'warning' | 'danger';

export interface ChunkGroupGraphImportData {
  loc?: string;
  request?: string;
  snippet?: string;
  sourceModule?: string | null;
}

export interface ChunkGroupGraphIncomingImportData
  extends ChunkGroupGraphImportData {
  edgeId: string;
  from: string;
  fromName: string;
  to: string;
  toName: string;
}

export interface ChunkGroupGraphPathData {
  id: string;
  label: string;
  nodeIds: string[];
  nodeNames: string[];
  edgeIds: string[];
  chunkIds: string[];
  chunks: ChunkGroupGraphChunkData[];
  totalEmittedSize: number;
  totalJSSize: number;
  unnecessarySize: number;
  unnecessaryModuleCount: number;
  ratio: number;
  severity: ChunkGroupGraphPathSeverity;
  topUnnecessaryModules: ChunkGroupGraphModuleData[];
}

export interface ChunkGroupGraphNodeData {
  id: string;
  name: string;
  isInitial: boolean;
  totalEmittedSize: number;
  groupTotalJSSize: number;
  actualModuleCount: number;
  rootModuleCount: number;
  reachableModuleCount: number;
  localRemovableJSModuleCount: number;
  localRemovableJSSize: number;
  removableJSModuleCount: number;
  removableJSSize: number;
  inheritedRemovableJSModuleCount: number;
  inheritedRemovableJSSize: number;
  nonJSResidualCount: number;
  chunks: ChunkGroupGraphChunkData[];
  localRemovableJSModules: ChunkGroupGraphModuleData[];
  inheritedRemovableJSModules: ChunkGroupGraphModuleData[];
  removableJSModules: ChunkGroupGraphModuleData[];
  incomingEdgeIds: string[];
  outgoingEdgeIds: string[];
  incomingImports: ChunkGroupGraphIncomingImportData[];
  paths: ChunkGroupGraphPathData[];
  pathCount: number;
  pathsTruncated: boolean;
  worstPathSeverity: ChunkGroupGraphPathSeverity;
  maxPathUnnecessarySize: number;
  maxPathRatio: number;
  searchText: string;
}

export interface ChunkGroupGraphEdgeData {
  id: string;
  from: string;
  to: string;
  fromName: string;
  toName: string;
  imports: ChunkGroupGraphImportData[];
}

export interface ChunkGroupGraphOverviewData {
  totalGroupCount: number;
  entryGroupCount: number;
  asyncGroupCount: number;
  totalEdgeCount: number;
  removableGroupCount: number;
  warningGroupCount: number;
  dangerGroupCount: number;
  totalRemovableSize: number;
  totalLocalRemovableSize: number;
  totalInheritedRemovableSize: number;
  totalPathCount: number;
  warningPathCount: number;
  dangerPathCount: number;
  truncatedPathGroupCount: number;
}

export interface ChunkGroupGraphData {
  nodes: ChunkGroupGraphNodeData[];
  edges: ChunkGroupGraphEdgeData[];
  overview: ChunkGroupGraphOverviewData;
  entryNodeIds: string[];
  priorityNodeIds: string[];
  pathLimit: number;
}
