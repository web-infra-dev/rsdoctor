import parse from 'url-parse';
import { Constants, Client } from '@rsdoctor/types';
import { endsWith } from 'lodash-es';

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
  if (endsWith(url.hash, Client.DoctorClientRoutes.Uploader)) {
    url.set('hash', Client.DoctorClientRoutes.Overall);
  }
}

export function isJsDataUrl(path: string) {
  return path.startsWith('data:text/javascript;');
}

export function getManifestUrlFromUrlQuery(): string | void {
  const { query } = parse(location.href, true);
  const url = query[Client.DoctorClientUrlQuery.ManifestFile];
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
    [Client.DoctorClientUrlQuery.ManifestFile]: manifestCloudUrl,
  });

  return url.toString();
}

export function getDemoUrl() {
  if (process.env.OFFICAL_DEMO_MANIFEST_PATH) {
    return getSharingUrl(process.env.OFFICAL_DEMO_MANIFEST_PATH);
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
