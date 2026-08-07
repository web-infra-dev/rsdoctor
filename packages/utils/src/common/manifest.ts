import { Manifest } from '@rsdoctor/types';
import { Buffer } from 'buffer';
import { Readable } from 'stream';
import { StringDecoder } from 'string_decoder';
import { createInflate } from 'zlib';
import { isRemoteUrl } from './url';

async function* decodeBase64Shards(
  shardingFiles: string[],
  fetchImplement: (url: string) => Promise<string>,
) {
  let remainder = '';

  for (const url of shardingFiles) {
    const encodedText = remainder + (await fetchImplement(url));
    const decodableLength = encodedText.length - (encodedText.length % 4);

    if (decodableLength > 0) {
      yield Buffer.from(encodedText.slice(0, decodableLength), 'base64');
    }
    remainder = encodedText.slice(decodableLength);
  }

  if (remainder.length > 0) {
    yield Buffer.from(remainder, 'base64');
  }
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

  const inflater = Readable.from(
    decodeBase64Shards(shardingFiles, fetchImplement),
  ).pipe(createInflate());
  const decoder = new StringDecoder('utf8');
  const jsonParts: string[] = [];

  for await (const chunk of inflater) {
    jsonParts.push(decoder.write(Buffer.from(chunk)));
  }
  const finalPart = decoder.end();
  if (finalPart) jsonParts.push(finalPart);

  return JSON.parse(jsonParts.join(''));
}

export async function fetchShardingFiles(
  data: Manifest.RsdoctorManifestWithShardingFiles['data'],
  fetchImplement: (url: string) => Promise<string>,
  filterKeys?: Array<keyof Manifest.RsdoctorManifestData>,
) {
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
