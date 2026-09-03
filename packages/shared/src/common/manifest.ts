import { Manifest } from '../types';
import { Buffer } from 'buffer';
import { pipeline, Readable, Writable } from 'stream';
import { StringDecoder } from 'string_decoder';
import { createInflate } from 'zlib';
import { isRemoteUrl } from './url';

const SHARD_FETCH_CONCURRENCY = 3;

type ShardFetchResult =
  | { status: 'fulfilled'; value: string }
  | { status: 'rejected'; reason: unknown };

async function* decodeBase64Shards(
  shardingFiles: string[],
  fetchImplement: (url: string) => Promise<string>,
) {
  let remainder = '';
  let nextIndex = 0;
  const pending = new Map<number, Promise<ShardFetchResult>>();

  const fillQueue = () => {
    while (
      nextIndex < shardingFiles.length &&
      pending.size < SHARD_FETCH_CONCURRENCY
    ) {
      const index = nextIndex++;
      pending.set(
        index,
        Promise.resolve()
          .then(() => fetchImplement(shardingFiles[index]))
          .then(
            (value) => ({ status: 'fulfilled' as const, value }),
            (reason) => ({ status: 'rejected' as const, reason }),
          ),
      );
    }
  };

  fillQueue();

  for (let index = 0; index < shardingFiles.length; index++) {
    const result = await pending.get(index)!;
    pending.delete(index);

    if (result.status === 'rejected') {
      throw result.reason;
    }

    fillQueue();

    const encodedText = remainder + result.value;
    const decodableLength = encodedText.length - (encodedText.length % 4);

    if (decodableLength > 0) {
      yield Buffer.from(encodedText.slice(0, decodableLength), 'base64');
    }
    remainder = encodedText.slice(decodableLength);
  }

  if (remainder.length === 1) {
    throw new Error('Invalid Base64 shard data: truncated final quartet.');
  }

  if (remainder.length > 0) {
    yield Buffer.from(remainder, 'base64');
  }
}

function createDecodedShardStream(
  shardingFiles: string[],
  fetchImplement: (url: string) => Promise<string>,
) {
  const iterator = decodeBase64Shards(shardingFiles, fetchImplement)[
    Symbol.asyncIterator
  ]();
  let reading = false;

  return new Readable({
    read() {
      if (reading) return;
      reading = true;

      void iterator.next().then(
        ({ value, done }) => {
          reading = false;
          this.push(done ? null : value);
        },
        (error) => {
          reading = false;
          this.destroy(error);
        },
      );
    },
  });
}

export function isShardingData(data: unknown): data is string[] {
  if (Array.isArray(data) && data.length > 0) {
    if (data.every((e) => isRemoteUrl(e))) {
      return true;
    }
  }

  return false;
}

export async function fetchShardingData(
  shardingFiles: string[],
  fetchImplement: (url: string) => Promise<string>,
) {
  if (shardingFiles.length === 0) return [];

  const decoder = new StringDecoder('utf8');
  const jsonParts: string[] = [];

  await new Promise<void>((resolve, reject) => {
    pipeline(
      createDecodedShardStream(shardingFiles, fetchImplement),
      createInflate(),
      new Writable({
        write(chunk, _encoding, callback) {
          jsonParts.push(decoder.write(Buffer.from(chunk)));
          callback();
        },
      }),
      (error) => {
        if (error) reject(error);
        else resolve();
      },
    );
  });

  const finalPart = decoder.end();
  if (finalPart) jsonParts.push(finalPart);

  return JSON.parse(jsonParts.join(''));
}

export async function fetchShardingFiles(
  data: Manifest.RsdoctorManifestWithShardingFiles['data'],
  fetchImplement: (url: string) => Promise<string>,
  filterKeys?: Array<keyof Manifest.RsdoctorManifestData>,
): Promise<Manifest.RsdoctorManifestData> {
  const datas = await Promise.all(
    Object.keys(data).map(async (_key) => {
      const key = _key as keyof Manifest.RsdoctorManifestData;
      const val = data[key];
      if (filterKeys?.length && filterKeys.indexOf(key) < 0) {
        return {
          [key]: [],
        };
      }
      if (isShardingData(val)) {
        return {
          [key]: await fetchShardingData(val, fetchImplement),
        };
      }

      return {
        [key]: val,
      };
    }),
  );

  return datas.reduce((t, c) =>
    Object.assign(t, c),
  ) as Manifest.RsdoctorManifestData;
}
