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

export function getEnableRoutesFromUrlQuery(): string[] | void {
  const { query } = parse(location.href, true);
  let enableRoutesStr = query[Client.RsdoctorClientUrlQuery.EnableRoutes];

  if (!enableRoutesStr && location.hash) {
    const hashUrl = parse(location.hash, true);
    enableRoutesStr = hashUrl.query[Client.RsdoctorClientUrlQuery.EnableRoutes];
  }

  // If still not found, try manual parsing of hash fragment
  if (!enableRoutesStr && location.hash) {
    const hashFragment = location.hash;
    const queryIndex = hashFragment.indexOf('?');
    if (queryIndex !== -1) {
      const queryString = hashFragment.substring(queryIndex + 1);
      const urlParams = new URLSearchParams(queryString);
      enableRoutesStr =
        urlParams.get(Client.RsdoctorClientUrlQuery.EnableRoutes) || undefined;
    }
  }

  if (enableRoutesStr) {
    try {
      const result = JSON.parse(decodeURIComponent(enableRoutesStr));
      return result;
    } catch (err) {
      console.warn('Failed to parse enableRoutes from URL query:', err);
      return undefined;
    }
  }
  return undefined;
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

export function getSharingUrl(
  manifestCloudUrl: string,
  enableRoutes?: string[],
) {
  const url = parse(location.href, true);

  setDefaultUrl(url);
  setUploaderHash(url);

  const query: Record<string, string> = {
    ...url.query,
    [Client.RsdoctorClientUrlQuery.ManifestFile]: manifestCloudUrl,
  };

  // Add enableRoutes to query if provided
  if (enableRoutes && enableRoutes.length > 0) {
    query[Client.RsdoctorClientUrlQuery.EnableRoutes] =
      JSON.stringify(enableRoutes);
  }

  url.set('query', query);

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
