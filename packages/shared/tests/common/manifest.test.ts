import { Readable } from 'stream';
import { describe, expect, it, rs } from 'rstack/test';
import { Algorithm, Manifest } from '../../src/common-browser';

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

  it('rejects an invalid final Base64 remainder', async () => {
    const encodedText = Algorithm.compressText(JSON.stringify({ value: 1 }));

    await expect(
      Manifest.fetchShardingData([`${encodedText}A`], async (value) => value),
    ).rejects.toThrow('Invalid Base64 shard data');
  });

  it('propagates shard loading errors', async () => {
    const error = new Error('Failed to load shard');

    await expect(
      Manifest.fetchShardingData(['/missing-shard'], async () => {
        throw error;
      }),
    ).rejects.toBe(error);
  });

  it('prefetches shards with bounded concurrency and preserves order', async () => {
    const data = {
      modules: Array.from({ length: 20 }, (_, id) => ({
        id,
        source: `m${id}`,
      })),
    };
    const encodedText = Algorithm.compressText(JSON.stringify(data));
    const shardSize = Math.ceil(encodedText.length / 6);
    const shards = Array.from({ length: 6 }, (_, index) =>
      encodedText.slice(index * shardSize, (index + 1) * shardSize),
    );
    const urls = shards.map((_, index) => `shard-${index}`);
    const gates = shards.map(() => {
      let resolve!: () => void;
      const promise = new Promise<void>((resolvePromise) => {
        resolve = resolvePromise;
      });
      return { promise, resolve };
    });
    const started: number[] = [];
    const completed: number[] = [];
    let active = 0;
    let maxActive = 0;

    const resultPromise = Manifest.fetchShardingData(urls, async (url) => {
      const index = Number(url.slice('shard-'.length));
      started.push(index);
      active += 1;
      maxActive = Math.max(maxActive, active);
      await gates[index].promise;
      completed.push(index);
      active -= 1;
      return shards[index];
    });

    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(started).toStrictEqual([0, 1, 2]);

    gates.slice(3).forEach(({ resolve }) => resolve());
    gates[2].resolve();
    gates[1].resolve();
    gates[0].resolve();

    await expect(resultPromise).resolves.toStrictEqual(data);
    expect(completed.slice(0, 3)).toStrictEqual([2, 1, 0]);
    expect(maxActive).toBe(3);
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
