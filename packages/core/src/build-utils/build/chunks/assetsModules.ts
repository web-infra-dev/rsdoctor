import { Chunks } from '@rsdoctor/graph';
import { parseBundle } from '../utils';
import { SDK } from '@rsdoctor/types';

/**
 * Collects module size data from bundle assets, using source maps when available
 * and falling back to AST parsing for assets without source maps.
 *
 * @param moduleGraph - The module graph instance
 * @param chunkGraph - The chunk graph instance
 * @param bundleDir - Directory containing the bundle assets
 * @param sourceMapSets - Map of module paths to their source code (from source maps)
 * @param hasParseBundle - Whether to enable AST parsing fallback
 * @param assetsWithoutSourceMap - Optional set of asset paths that don't have source maps.
 *   When provided, these assets will be parsed using AST parsing instead of source map data.
 *   This is used as a fallback mechanism when source maps are unavailable for specific assets.
 *   If not provided and no source maps exist (sourceMapSets is empty), all assets will be parsed via AST.
 * @returns Promise that resolves when module data collection is complete
 */
export async function getAssetsModulesData(
  moduleGraph: SDK.ModuleGraphInstance,
  chunkGraph: SDK.ChunkGraphInstance,
  bundleDir: string,
  sourceMapSets: Map<string, string>,
  hasParseBundle = true,
  assetsWithoutSourceMap?: Set<string>,
) {
  return Chunks.getAssetsModulesData(
    moduleGraph,
    chunkGraph,
    bundleDir,
    hasParseBundle ? { parseBundle } : {},
    sourceMapSets,
    assetsWithoutSourceMap,
  );
}
