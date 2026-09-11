import path from 'path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import zlib from 'node:zlib';
import { tmpdir } from 'os';
import { describe, it, expect, afterEach } from '@rstest/core';
import { File } from '@rsdoctor/utils/build';
import { Manifest } from '@rsdoctor/utils/common';
import { createSDK, type MockSDKResponse } from '../../utils';

/**
 * Verify that writePieces (called via saveManifest) correctly shards data
 * to disk with unique file IDs, and that the data is recoverable.
 *
 * Regression: when Json.stringify split large data into multiple fragments,
 * each fragment was compressed independently and written with overlapping
 * shard IDs. The reader concatenates all shards and inflates them as one
 * stream, so the data could not be recovered.
 */
describe('writePieces shard file integrity', () => {
  let target: MockSDKResponse;
  let outputDir: string;

  afterEach(async () => {
    if (target) await target.dispose();
    if (outputDir) await File.fse.remove(outputDir);
  });

  it('should write loader data to unique shard files and be fully recoverable', async () => {
    target = await createSDK({ noServer: true });
    outputDir = path.resolve(tmpdir(), `sharding_test_${Date.now()}`);
    target.sdk.setOutputDir(outputDir);

    const entryCount = 50000;
    const loaderData = Array.from({ length: entryCount }, (_, i) => ({
      resource: { path: `/test/file${i}.ts`, ext: 'ts' },
      loaders: [
        {
          loader: '/test/loader.js',
          startAt: 1000000 + i,
          endAt: 1000100 + i,
          input: 'x'.repeat(100),
          result: 'y'.repeat(100),
        },
      ],
    }));

    await target.sdk.saveManifest({ loader: loaderData } as any, {});

    const loaderDir = path.join(outputDir, 'loader');
    expect(fs.existsSync(loaderDir)).toBe(true);

    const files = fs
      .readdirSync(loaderDir)
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    expect(files.length).toBeGreaterThanOrEqual(1);

    const uniqueIds = new Set(files);
    expect(uniqueIds.size).toBe(files.length);

    // Shards are slices of one base64 string. Concatenate then decode.
    const compressedBase64 = files
      .map((f) => fs.readFileSync(path.join(loaderDir, f), 'utf-8'))
      .join('');
    const recovered = zlib
      .inflateSync(Buffer.from(compressedBase64, 'base64'))
      .toString('utf-8');
    const parsed = JSON.parse(recovered);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(entryCount);
  });

  it('should handle the Json.stringify string[] fallback path', async () => {
    target = await createSDK({ noServer: true });
    outputDir = path.resolve(tmpdir(), `sharding_chunked_test_${Date.now()}`);
    target.sdk.setOutputDir(outputDir);

    // Create data that makes JSON.stringify throw, forcing the Json.stringify
    // fallback which returns string[]. BigInt is not JSON-serializable.
    const loaderData = [
      {
        resource: { path: '/test/a.ts', ext: 'ts' },
        loaders: [
          {
            loader: '/test/loader.js',
            startAt: 1000,
            endAt: 2000,
            input: 'a',
            result: 'b',
          },
        ],
        // BigInt makes JSON.stringify throw TypeError
        _forceFallback: BigInt(1),
      },
    ];

    await target.sdk.saveManifest({ loader: loaderData } as any, {});

    const loaderDir = path.join(outputDir, 'loader');
    expect(fs.existsSync(loaderDir)).toBe(true);

    const files = fs
      .readdirSync(loaderDir)
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    // Json.stringify returns string[], so writePieces uses the shared deflate
    // stream path. Even one fragment exercises the fallback branch.
    expect(files.length).toBeGreaterThanOrEqual(1);

    const uniqueIds = new Set(files);
    expect(uniqueIds.size).toBe(files.length);

    // Verify the data is recoverable
    const compressedBase64 = files
      .map((f) => fs.readFileSync(path.join(loaderDir, f), 'utf-8'))
      .join('');
    const recovered = zlib
      .inflateSync(Buffer.from(compressedBase64, 'base64'))
      .toString('utf-8');
    const parsed = JSON.parse(recovered);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(1);
    expect(parsed[0].resource.path).toBe('/test/a.ts');
  });

  it('should write multiple JSON fragments as one deflate stream', async () => {
    target = await createSDK({ noServer: true });
    outputDir = path.resolve(tmpdir(), `sharding_fragments_test_${Date.now()}`);

    const graph = { modules: [{ id: 1 }, { id: 2 }] };
    const fragments = ['{"modules":[', '{"id":1},', '{"id":2}]}'];
    const writer = target.sdk as unknown as {
      writeJsonFragmentsToFolder(
        fragments: string[],
        dir: string,
        key: string,
      ): Promise<{ files: Array<{ path: string }> }>;
    };
    const result = await writer.writeJsonFragmentsToFolder(
      fragments,
      outputDir,
      'moduleGraph',
    );
    const files = result.files.map(({ path: filePath }) => filePath);

    await expect(
      Manifest.fetchShardingData(files, (filePath) =>
        fsp.readFile(filePath, 'utf-8'),
      ),
    ).resolves.toStrictEqual(graph);
  });
});
