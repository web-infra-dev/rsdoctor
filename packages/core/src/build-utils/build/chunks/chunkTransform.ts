import { Plugin } from '@rsdoctor/shared/types';
import { Chunks } from '@rsdoctor/core/graph';

export function chunkTransform(
  assetMap: Map<string, { content: string }>,
  bundleStats: Plugin.StatsCompilation,
) {
  return Chunks.chunkTransform(assetMap, bundleStats);
}
