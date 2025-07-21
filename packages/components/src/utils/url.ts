import parse from 'url-parse';
import { Constants, Client } from '@rsdoctor/types';

function setDefaultUrl(url: parse<Record<string, string | undefined>>) {
  if (process.env.NODE_ENV !== 'development') {
    const uri = parse(Constants.RsdoctorClientUrl, true);
    url.set('origin', uri.origin);
    url.set('protocol', uri.protocol);
    url.set('host', uri.host);
    url.set('pathname', uri.pathname);
  }
}

function setUploaderHash(url: parse<Record<string, string | undefined>>) {
  if (url.hash.endsWith(Client.RsdoctorClientRoutes.Uploader)) {
    url.set('hash', Client.RsdoctorClientRoutes.Overall);
  }
}

export function isJsDataUrl(path: string) {
  return path.startsWith('data:text/javascript;');
}

export function getManifestUrlFromUrlQuery(): string | void {
  const { query } = parse(location.href, true);
  const url = query[Client.RsdoctorClientUrlQuery.ManifestFile];
  if (url) {
    return decodeURIComponent(url);
  }
}

export function changeOrigin(origin: string) {
  const url = parse(location.href, true);
  const newUrl = parse(origin, true);

  setUploaderHash(url);

  url.set('origin', origin);
  url.set('protocol', newUrl.protocol);
  url.set('host', newUrl.host);
  url.set('port', newUrl.port);

  return url.toString();
}

export function getSharingUrl(manifestCloudUrl: string) {
  const url = parse(location.href, true);

  setDefaultUrl(url);
  setUploaderHash(url);

  url.set('query', {
    ...url.query,
    [Client.RsdoctorClientUrlQuery.ManifestFile]: manifestCloudUrl,
  });

  return url.toString();
}

export function getDemoUrl() {
  if (process.env.OFFICIAL_DEMO_MANIFEST_PATH) {
    return getSharingUrl(process.env.OFFICIAL_DEMO_MANIFEST_PATH);
  }
  return null;
}

export const getShortPath = (path: string) => {
  if (path?.indexOf('node_modules') >= 0) {
    const pathArr = path.split('node_modules');
    return `node_modules${pathArr[pathArr.length - 1]}`;
  }
  if (path?.length) {
    return `${path?.split('/').slice(-4).join('/')}`;
  }
  return path;
};

export function isDef<E = unknown>(data: E): data is NonNullable<E> {
  return data !== undefined && data !== null;
}
