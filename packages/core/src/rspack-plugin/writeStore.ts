import type { Plugin, SDK } from '@rsdoctor/shared/types';

// Favor zlib's fastest mode while report shards are rewritten after each HMR.
const watchCompressionLevel = 1;

export function getWriteStoreOptions(
  compiler: Pick<Plugin.BaseCompiler, 'watchMode' | 'parentCompilation'>,
): SDK.WriteStoreOptionsType | undefined {
  const isWatching =
    compiler.watchMode || compiler.parentCompilation?.compiler.watchMode;

  return isWatching ? { compressionLevel: watchCompressionLevel } : undefined;
}
