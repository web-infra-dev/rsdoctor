import { Manifest, SDK } from '@rsdoctor/types';
import { Manifest as ManifestMethod, Url } from '@rsdoctor/utils/common';
import { APILoaderMode4Dev } from '../constants';
import { getManifestUrlFromUrlQuery } from './url';
import { getAPILoaderModeFromStorage } from './storage';

function random() {
  return `${Date.now()}${Math.floor(Math.random() * 10000)}`;
}

function mergeAbortSignal(signal?: AbortSignal, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', () => controller.abort(), {
        once: true,
      });
    }
  }

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId),
  };
}

function resolveRequestUrl(url: string): string {
  if (
    process.env.NODE_ENV === 'development' &&
    getAPILoaderModeFromStorage() === APILoaderMode4Dev.Local &&
    url.startsWith('/')
  ) {
    const nextUrl =
      url === manifestUrlForDev ? SDK.ServerAPI.API.Manifest : url;
    const currentUrl = new URL(location.href);
    currentUrl.port = String(process.env.LOCAL_CLI_PORT!);
    return `${currentUrl.origin}${nextUrl}`;
  }

  return url;
}

async function requestText(url: string, timeout: number) {
  const { signal, clear } = mergeAbortSignal(undefined, timeout);
  try {
    const res = await fetch(resolveRequestUrl(url), { signal });
    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}`);
    }
    return await res.text();
  } finally {
    clear();
  }
}

export async function fetchShardingFile(url: string): Promise<string> {
  if (Url.isUrl(url)) {
    return requestText(url, 999999);
  }
  // json string
  return url;
}

export async function loadManifestByUrl(url: string) {
  const json = await fetchJSONByUrl(url);

  const res = await parseManifest(json);
  return res;
}

export async function fetchJSONByUrl(url: string) {
  let json: unknown = await requestText(url, 30000);

  if (typeof json === 'string') {
    const trimmed = json.trim();
    // If we got an HTML document (usually error page / SPA fallback), skip JSON.parse
    if (/^<!doctype html\b/i.test(trimmed) || /^<html\b/i.test(trimmed)) {
      json = {} as Manifest.RsdoctorManifestWithShardingFiles;
    } else {
      json = JSON.parse(json);
    }
  }

  return json as Manifest.RsdoctorManifestWithShardingFiles;
}

export function fetchJSONByUrls(urls: string[]) {
  return Promise.all(urls.map((url) => fetchJSONByUrl(url)));
}

export async function parseManifest(
  json: Manifest.RsdoctorManifestWithShardingFiles,
) {
  let transformedData: Manifest.RsdoctorManifestData;

  try {
    // try to load cloud data first
    if (json.cloudData) {
      try {
        transformedData = await ManifestMethod.fetchShardingFiles(
          json.cloudData,
          fetchShardingFile,
        );
      } catch (error) {
        console.log('cloudData load error: ', error);
      }
    } else {
      transformedData = await ManifestMethod.fetchShardingFiles(
        json.data,
        fetchShardingFile,
      );
    }
  } catch {
    transformedData = await ManifestMethod.fetchShardingFiles(
      json.data,
      fetchShardingFile,
    );
  }

  return {
    ...json,
    data: transformedData!,
  };
}

const manifestUrlForDev = '/manifest.json';

export function getManifestUrl(): string {
  let file: string | void;

  if (
    (window as { [key: string]: any })[
      Manifest.RsdoctorManifestClientConstant.WindowPropertyForManifestUrl
    ]
  ) {
    // load from window property
    file = (window as { [key: string]: any })[
      Manifest.RsdoctorManifestClientConstant.WindowPropertyForManifestUrl
    ];
  } else {
    // load from url query
    file = getManifestUrlFromUrlQuery();
  }

  if (!file) {
    file = SDK.ServerAPI.API.Manifest;
  }

  return file;
}

const pool = new Map<
  string,
  Promise<Manifest.RsdoctorManifestWithShardingFiles>
>();

export async function fetchManifest(url = getManifestUrl()) {
  if (!pool.has(url)) {
    pool.set(
      url,
      fetchJSONByUrl(url).catch((err) => {
        pool.delete(url);
        throw err;
      }),
    );
  }

  const res = await pool.get(url)!;

  return res;
}

export async function postServerAPI<
  T extends SDK.ServerAPI.API,
  B extends SDK.ServerAPI.InferRequestBodyType<T> =
    SDK.ServerAPI.InferRequestBodyType<T>,
  R extends SDK.ServerAPI.InferResponseType<T> =
    SDK.ServerAPI.InferResponseType<T>,
>(...args: B extends void ? [api: T] : [api: T, body: B]): Promise<R> {
  const [api, body] = args;
  const timeout = process.env.NODE_ENV === 'development' ? 10000 : 60000;
  const { signal, clear } = mergeAbortSignal(undefined, timeout);
  try {
    const res = await fetch(resolveRequestUrl(`${api}?_t=${random()}`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}`);
    }
    return (await res.json()) as R;
  } finally {
    clear();
  }
}
