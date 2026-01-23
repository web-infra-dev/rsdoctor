import axios from 'axios';
import { Manifest, SDK } from '@rsdoctor/types';
import { Manifest as ManifestMethod, Url } from '@rsdoctor/utils/common';
import { APILoaderMode4Dev } from '../constants';
import { getManifestUrlFromUrlQuery } from './url';
import { getAPILoaderModeFromStorage } from './storage';

function random() {
  return `${Date.now()}${Math.floor(Math.random() * 10000)}`;
}

export async function fetchShardingFile(url: string): Promise<string> {
  if (Url.isUrl(url)) {
    return axios
      .get(url, { timeout: 999999, responseType: 'text' })
      .then((e) => e.data);
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
  const res = await axios.get(url, { timeout: 30000 });
  let json: unknown = res.data;

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

// test for cli
if (process.env.NODE_ENV === 'development') {
  if (getAPILoaderModeFromStorage() === APILoaderMode4Dev.Local) {
    axios.interceptors.request.use((c) => {
      c.withCredentials = false;
      if (c.url?.startsWith('/')) {
        if (c.url === manifestUrlForDev) {
          c.url = SDK.ServerAPI.API.Manifest;
        }
        const url = new URL(location.href);
        url.port = String(process.env.LOCAL_CLI_PORT!);
        return {
          ...c,
          url: `${url.origin}${c.url}`,
        };
      }

      return c;
    });
  }
}

export async function postServerAPI<
  T extends SDK.ServerAPI.API,
  B extends
    SDK.ServerAPI.InferRequestBodyType<T> = SDK.ServerAPI.InferRequestBodyType<T>,
  R extends
    SDK.ServerAPI.InferResponseType<T> = SDK.ServerAPI.InferResponseType<T>,
>(...args: B extends void ? [api: T] : [api: T, body: B]): Promise<R> {
  const [api, body] = args;
  const timeout = process.env.NODE_ENV === 'development' ? 10000 : 60000;
  const { data } = await axios.post<SDK.ServerAPI.InferResponseType<T>>(
    `${api}?_t=${random()}`,
    body,
    { timeout },
  );
  return data as R;
}
