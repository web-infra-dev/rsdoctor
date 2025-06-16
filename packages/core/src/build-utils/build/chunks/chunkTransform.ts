import { Plugin } from '@rsdoctor/types';
import { chunkTransform as transform } from '@rsdoctor/graph/transform-bundle/chunks';

export function chunkTransform(
  assetMap: Map<string, { content: string }>,
  bundleStats: Plugin.StatsCompilation,
) {
  return transform(assetMap, bundleStats);
}
