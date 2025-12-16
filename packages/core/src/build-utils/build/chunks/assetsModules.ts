import { Chunks } from '@rsdoctor/graph';
import { parseBundle } from '../utils';
import { SDK } from '@rsdoctor/types';

/**
 * Get assets modules data by parsing bundles with sourcemap or AST parsing
 * @param moduleGraph The ModuleGraph instance
 * @param chunkGraph The ChunkGraph instance
 * @param bundleDir The directory containing the bundle files
 * @param sourceMapSets Map of module paths to their source code extracted from sourcemaps
 * @param hasParseBundle Whether to enable AST-based bundle parsing
 * @param assetsWithoutSourceMap Set of asset paths that don't have sourcemaps and should be parsed using AST parsing
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
