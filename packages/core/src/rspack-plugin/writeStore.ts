import type { Plugin, SDK } from '@rsdoctor/shared/types';
import { isCompilerWatching } from '../inner-plugins/utils/config';

// Favor zlib's fastest mode while report shards are rewritten after each HMR.
const watchWriteStoreOptions: SDK.WriteStoreOptionsType = {
  compressionLevel: 1,
};

export function getWriteStoreOptions(
  compiler: Pick<Plugin.BaseCompiler, 'watchMode' | 'parentCompilation'>,
): SDK.WriteStoreOptionsType | undefined {
  return isCompilerWatching(compiler) ? watchWriteStoreOptions : undefined;
}
