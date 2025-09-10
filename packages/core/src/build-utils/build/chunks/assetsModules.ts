import { Chunks } from '@rsdoctor/graph';
import { parseBundle } from '../utils';
import { SDK } from '@rsdoctor/types';

export async function getAssetsModulesData(
  moduleGraph: SDK.ModuleGraphInstance,
  chunkGraph: SDK.ChunkGraphInstance,
  bundleDir: string,
  sourceMapSets: Map<string, string>,
  hasParseBundle = true,
) {
  return Chunks.getAssetsModulesData(
    moduleGraph,
    chunkGraph,
    bundleDir,
    hasParseBundle ? { parseBundle } : {},
    sourceMapSets,
  );
}
