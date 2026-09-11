import { randomBytes } from 'node:crypto';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { inflateSync } from 'node:zlib';
import { afterEach, describe, expect, it } from '@rstest/core';
import { File } from '@rsdoctor/utils/build';
import { writeManifestShards } from '../../../src/sdk/utils';

describe('writeManifestShards', () => {
  let outputDir: string;

  afterEach(async () => {
    if (outputDir) await File.fse.remove(outputDir);
  });

  it('writes one continuous Base64 deflate stream into bounded shards', async () => {
    outputDir = path.resolve(
      tmpdir(),
      `manifest_stream_sharding_${Date.now()}`,
    );
    const data = {
      modules: [
        {
          id: 1,
          source: randomBytes(32 * 1024).toString('base64'),
        },
      ],
    };
    const jsonText = JSON.stringify(data);
    const fragmentSize = Math.ceil(jsonText.length / 3);
    const fragments = Array.from({ length: 3 }, (_, index) =>
      jsonText.slice(index * fragmentSize, (index + 1) * fragmentSize),
    ).filter(Boolean);

    const files = await writeManifestShards(fragments, outputDir, {
      index: 5,
      // Deliberately not divisible by 3 or 4 to exercise both the deflate
      // chunk carry and arbitrary physical shard boundaries.
      shardSize: 1021,
    });
    const shardContents = await Promise.all(
      files.map(({ path: filePath }) => fsp.readFile(filePath, 'utf8')),
    );
    const encodedText = shardContents.join('');
    const restored = JSON.parse(
      inflateSync(Buffer.from(encodedText, 'base64')).toString('utf8'),
    );

    expect(files.length).toBeGreaterThan(1);
    expect(files.map(({ basename }) => basename)).toStrictEqual(
      files.map((_, index) => String(index + 5)),
    );
    expect(
      shardContents.slice(0, -1).every((text) => text.length === 1021),
    ).toBe(true);
    expect(encodedText.slice(0, -2)).not.toContain('=');
    expect(restored).toStrictEqual(data);
  });

  it('rejects empty fragments and invalid shard sizes', async () => {
    outputDir = path.resolve(
      tmpdir(),
      `manifest_stream_sharding_invalid_${Date.now()}`,
    );

    await expect(writeManifestShards([], outputDir)).rejects.toThrow(
      'Cannot write empty JSON fragments',
    );
    await expect(
      writeManifestShards(['{}'], outputDir, { shardSize: 0 }),
    ).rejects.toThrow('Manifest shard size must be a positive integer');
  });
});
