import {
  getAssetsModulesData as transform,
  ParsedModuleSizeData,
} from '@rsdoctor/graph/transform-bundle/chunks';
import { parseBundle } from '../utils';
import { SDK } from '@rsdoctor/types';

export async function getAssetsModulesData(
  moduleGraph: SDK.ModuleGraphInstance,
  chunkGraph: SDK.ChunkGraphInstance,
  bundleDir: string,
  hasParseBundle = true,
): Promise<ParsedModuleSizeData | null> {
  return transform(
    moduleGraph,
    chunkGraph,
    bundleDir,
    hasParseBundle ? { parseBundle } : {},
  );
}
