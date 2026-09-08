import { brotliCompressSync, constants } from 'node:zlib';

export const DEFAULT_BROTLI_LEVEL = 6;

export function getBrotliSize(
  content: string,
  level = DEFAULT_BROTLI_LEVEL,
): number {
  return brotliCompressSync(content, {
    params: { [constants.BROTLI_PARAM_QUALITY]: level },
  }).length;
}
