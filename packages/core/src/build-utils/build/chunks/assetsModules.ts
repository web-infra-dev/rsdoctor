import { Chunks } from '@rsdoctor/core/graph';
import { SDK } from '@rsdoctor/shared/types';

/**
 * Collects module size data from bundle assets using source maps.
 *
 * @param moduleGraph - The module graph instance
 * @param chunkGraph - The chunk graph instance
 * @param bundleDir - Directory containing the bundle assets
 * @param sourceMapSets - Map of module paths to their source code (from source maps)
 * @returns Promise that resolves when module data collection is complete
 */
export async function getAssetsModulesData(
  moduleGraph: SDK.ModuleGraphInstance,
  chunkGraph: SDK.ChunkGraphInstance,
  bundleDir: string,
  sourceMapSets: Map<string, string>,
  _hasParseBundle = true,
  assetsWithoutSourceMap?: Set<string>,
) {
  return Chunks.getAssetsModulesData(
    moduleGraph,
    chunkGraph,
    bundleDir,
    {},
    sourceMapSets,
    assetsWithoutSourceMap,
  );
}
