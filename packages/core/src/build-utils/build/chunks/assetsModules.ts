import { getAssetsModulesData as transform } from '@/build-utils/common/chunks';
import { parseBundle } from '../utils';
import { SDK } from '@rsdoctor/types';

export async function getAssetsModulesData(
  moduleGraph: SDK.ModuleGraphInstance,
  chunkGraph: SDK.ChunkGraphInstance,
  bundleDir: string,
  sourceMapSets: Map<string, string>,
  hasParseBundle = true,
) {
  return transform(
    moduleGraph,
    chunkGraph,
    bundleDir,
    hasParseBundle ? { parseBundle } : {},
    sourceMapSets,
  );
}
