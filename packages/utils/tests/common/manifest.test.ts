import { describe, expect, it, rs } from '@rstest/core';
import { Readable } from 'stream';
import { Algorithm, Manifest } from '../../src/common';

describe('test src/common/manifest.ts', () => {
  it('isShardingData', () => {
    expect(Manifest.isShardingData([])).toBeFalsy();
    expect(Manifest.isShardingData([1])).toBeFalsy();
    expect(Manifest.isShardingData([1, '2'])).toBeFalsy();
    expect(Manifest.isShardingData([1, 'https://'])).toBeFalsy();
    expect(Manifest.isShardingData([1, '2', 'https://'])).toBeFalsy();
    expect(Manifest.isShardingData(['http://'])).toBeTruthy();
    expect(Manifest.isShardingData(['https://'])).toBeTruthy();
    expect(Manifest.isShardingData(['/Users/a/b.json'])).toBeTruthy();
    expect(Manifest.isShardingData(['http://', 'https://'])).toBeTruthy();
    expect(
      Manifest.isShardingData(['/Users/a/b.json', 'https://']),
    ).toBeTruthy();
  });

  it('fetchShardingData', async () => {
    expect(await Manifest.fetchShardingData([], async (v) => v)).toStrictEqual(
      [],
    );

    expect(
      await Manifest.fetchShardingData(
        [Algorithm.compressText(JSON.stringify({ a: 1, b: '2' }))],
        async (v) => v,
      ),
    ).toStrictEqual({ a: 1, b: '2' });

    const v = Algorithm.compressText(
      JSON.stringify({
        a: 1,
        b: '2',
        c: [3, 4],
        d: true,
      }),
    );
    expect(
      await Manifest.fetchShardingData(
        [v.slice(0, 5), v.slice(5, 12), v.slice(12)],
        async (v) => v,
      ),
    ).toStrictEqual({ a: 1, b: '2', c: [3, 4], d: true });
  });

  it('decodes arbitrary Base64 and UTF-8 shard boundaries', async () => {
    const data = {
      modules: [
        {
          id: 1,
          source: '🙂'.repeat(10000),
        },
      ],
    };
    const encodedText = Algorithm.compressText(JSON.stringify(data));
    const shardSizes = [1, 2, 5, 7, 11, 13];
    const shards: string[] = [];
    let offset = 0;
    let shardIndex = 0;

    while (offset < encodedText.length) {
      const shardSize = shardSizes[shardIndex % shardSizes.length];
      shards.push(encodedText.slice(offset, offset + shardSize));
      offset += shardSize;
      shardIndex += 1;
    }

    await expect(
      Manifest.fetchShardingData(shards, async (value) => value),
    ).resolves.toStrictEqual(data);
  });

  it('propagates shard loading errors', async () => {
    const error = new Error('Failed to load shard');

    await expect(
      Manifest.fetchShardingData(['/missing-shard'], async () => {
        throw error;
      }),
    ).rejects.toBe(error);
  });

  it('does not depend on Readable.from in browser environments', async () => {
    const fromSpy = rs.spyOn(Readable, 'from').mockImplementation(() => {
      throw new Error('Readable.from is not available in the browser');
    });
    const data = { modules: [{ id: 1 }] };

    try {
      await expect(
        Manifest.fetchShardingData(
          [Algorithm.compressText(JSON.stringify(data))],
          async (value) => value,
        ),
      ).resolves.toStrictEqual(data);
    } finally {
      fromSpy.mockRestore();
    }
  });
});
