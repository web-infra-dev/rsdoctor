import { Manifest, SDK } from '@rsdoctor/shared/types';
import { Algorithm } from '@rsdoctor/shared/common-browser';
import { BaseDataLoader } from './base';
import { Constants } from '@rsdoctor/shared/types';

const MAX_MEMOIZED_API_RESPONSES = 64;

interface BriefDataCache {
  data: Map<string, Promise<unknown>>;
  api: Map<string, Promise<unknown>>;
}

// Every ServerAPIProvider creates its own loader, so decoded sections and API
// responses are shared through the report data object. Keying by that object
// keeps an uploaded report from reading another report's results.
const caches = new WeakMap<object, BriefDataCache>();

function getBriefData(): Record<string, unknown> | undefined {
  return window[Constants.WINDOW_RSDOCTOR_TAG] as
    Record<string, unknown> | undefined;
}

function getCache(source: object): BriefDataCache {
  let cache = caches.get(source);
  if (!cache) {
    cache = { data: new Map(), api: new Map() };
    caches.set(source, cache);
  }
  return cache;
}

function base64ToBytes(input: string): Uint8Array {
  const fromBase64 = (
    Uint8Array as unknown as { fromBase64?: (value: string) => Uint8Array }
  ).fromBase64;
  if (typeof fromBase64 === 'function') {
    return fromBase64(input);
  }
  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes text written by `Algorithm.compressText` with the browser's native
 * decoders, which avoids the main-thread zlib and Buffer polyfills.
 */
export async function decompressBriefText(input: string): Promise<string> {
  if (
    typeof DecompressionStream !== 'function' ||
    typeof Response !== 'function' ||
    typeof Blob !== 'function'
  ) {
    return Algorithm.decompressText(input);
  }
  const stream = new Blob([base64ToBytes(input) as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('deflate'));
  return new Response(stream).text();
}

async function parseData(data: unknown): Promise<unknown> {
  if (typeof data !== 'string') {
    return data;
  }

  try {
    return JSON.parse(await decompressBriefText(data));
  } catch {
    return data;
  }
}

export class BriefDataLoader extends BaseDataLoader {
  public isLocal() {
    return false;
  }

  public async loadData<T extends Manifest.RsdoctorManifestMappingKeys>(
    key: T,
  ): Promise<Manifest.InferManifestDataValue<T>>;

  public async loadData(key: string): Promise<unknown> {
    console.log(`[loadData]-[key]: ${key}`);
    const [scope] = this.getKeys(key);

    console.log(`[loadData]-[scope]: ${scope}`);
    const source = getBriefData();
    if (!source) return;

    const data = source[scope];
    if (!data) return;

    const cache = getCache(source).data;
    let task = cache.get(scope);
    if (!task) {
      task = parseData(data);
      cache.set(scope, task);
    }
    return task;
  }

  public getData(scope: keyof Manifest.RsdoctorManifestData) {
    console.log(`[getData]-[scope]: ${scope}`);
    return window[Constants.WINDOW_RSDOCTOR_TAG][scope];
  }

  public async loadAPI<
    T extends SDK.ServerAPI.API,
    B extends SDK.ServerAPI.InferRequestBodyType<T> =
      SDK.ServerAPI.InferRequestBodyType<T>,
    R extends SDK.ServerAPI.InferResponseType<T> =
      SDK.ServerAPI.InferResponseType<T>,
  >(...args: B extends void ? [api: T] : [api: T, body: B]): Promise<R> {
    const source = getBriefData();
    if (!source) {
      return this.loader.loadAPI(...args) as Promise<R>;
    }

    // Report data never changes after load, so a response can be reused by
    // every component that asks for the same API and body.
    const [api, body] = args;
    const key = `${api}\0${JSON.stringify(body ?? null)}`;
    const cache = getCache(source).api;
    let task = cache.get(key);
    if (task) {
      cache.delete(key);
    } else {
      task = this.loader.loadAPI(...args);
      task.catch(() => {
        if (cache.get(key) === task) cache.delete(key);
      });
    }
    cache.set(key, task);
    if (cache.size > MAX_MEMOIZED_API_RESPONSES) {
      cache.delete(cache.keys().next().value!);
    }
    return task as Promise<R>;
  }

  public dispose() {
    super.dispose();
  }

  public onDataUpdate() {}

  public removeOnDataUpdate() {}
}
