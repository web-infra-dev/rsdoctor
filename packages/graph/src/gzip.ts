import { gzipSync } from 'node:zlib';

export const DEFAULT_GZIP_LEVEL = 9;

export function getGzipSize(
  content: string,
  level = DEFAULT_GZIP_LEVEL,
): number {
  return gzipSync(content, { level }).length;
}
