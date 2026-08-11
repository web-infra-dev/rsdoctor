import fsp from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { createDeflate } from 'node:zlib';

export const DEFAULT_MANIFEST_SHARD_SIZE = 10 * 1024 * 1024;

interface WriteManifestShardsOptions {
  index?: number;
  shardSize?: number;
}

export interface ManifestShardFile {
  path: string;
  basename: string;
}

/**
 * Compress JSON fragments as one deflate stream, encode that stream as one
 * continuous Base64 value, and write bounded physical shards.
 */
export async function writeManifestShards(
  jsonFragments: string[],
  folder: string,
  options: WriteManifestShardsOptions = {},
): Promise<ManifestShardFile[]> {
  if (jsonFragments.length === 0) {
    throw new Error('Cannot write empty JSON fragments.');
  }

  const { index = 0, shardSize = DEFAULT_MANIFEST_SHARD_SIZE } = options;
  if (!Number.isSafeInteger(shardSize) || shardSize <= 0) {
    throw new Error('Manifest shard size must be a positive integer.');
  }

  await fsp.mkdir(folder, { recursive: true });

  const files: ManifestShardFile[] = [];
  let shardParts: string[] = [];
  let shardLength = 0;

  const flushShard = async () => {
    if (shardLength === 0) return;

    const basename = String(index + files.length);
    const filePath = path.resolve(folder, basename);
    await fsp.writeFile(filePath, shardParts.join(''), 'utf8');
    files.push({ path: filePath, basename });
    shardParts = [];
    shardLength = 0;
  };

  const appendEncodedText = async (encodedText: string) => {
    let offset = 0;
    while (offset < encodedText.length) {
      const length = Math.min(
        shardSize - shardLength,
        encodedText.length - offset,
      );
      shardParts.push(encodedText.slice(offset, offset + length));
      shardLength += length;
      offset += length;

      if (shardLength === shardSize) {
        await flushShard();
      }
    }
  };

  const compressor = Readable.from(jsonFragments, {
    objectMode: false,
  }).pipe(createDeflate());
  let base64Remainder = Buffer.alloc(0);

  for await (const chunk of compressor) {
    const compressedChunk = Buffer.from(chunk);
    const bytes = base64Remainder.length
      ? Buffer.concat([base64Remainder, compressedChunk])
      : compressedChunk;
    const encodableLength = bytes.length - (bytes.length % 3);

    if (encodableLength > 0) {
      await appendEncodedText(
        bytes.subarray(0, encodableLength).toString('base64'),
      );
    }
    base64Remainder = Buffer.from(bytes.subarray(encodableLength));
  }

  if (base64Remainder.length > 0) {
    await appendEncodedText(base64Remainder.toString('base64'));
  }
  await flushShard();

  return files;
}
