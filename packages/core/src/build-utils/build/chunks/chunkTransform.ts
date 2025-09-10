import { Plugin } from '@rsdoctor/types';
import { Chunks } from '@rsdoctor/graph';

export function chunkTransform(
  assetMap: Map<string, { content: string }>,
  bundleStats: Plugin.StatsCompilation,
) {
  return Chunks.chunkTransform(assetMap, bundleStats);
}
