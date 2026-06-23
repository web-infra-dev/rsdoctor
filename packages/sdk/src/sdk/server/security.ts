import { isIP } from 'node:net';

export const DEFAULT_ALLOWED_CORS_ORIGINS =
  /^https?:\/\/(?:(?:[^:]+\.)?localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;

const LOCAL_HOSTNAMES = /^(?:localhost|[^:]+\.localhost)$/;

export function isAllowedRequestOrigin(origin: string | string[] | undefined) {
  if (origin === undefined) {
    return true;
  }

  return (
    typeof origin === 'string' && DEFAULT_ALLOWED_CORS_ORIGINS.test(origin)
  );
}

function isLoopbackAddress(hostname: string) {
  const version = isIP(hostname);

  if (version === 4) {
    return hostname.startsWith('127.');
  }

  if (version === 6) {
    return hostname === '::1';
  }

  return false;
}

function getHostnameFromHost(host: string) {
  if (host.startsWith('[')) {
    const endIndex = host.indexOf(']');
    return endIndex === -1 ? '' : host.slice(1, endIndex);
  }

  return host.split(':')[0];
}

export function isAllowedRequestHost(host: string | string[] | undefined) {
  if (typeof host !== 'string') {
    return false;
  }

  const hostname = getHostnameFromHost(host).toLowerCase();
  return LOCAL_HOSTNAMES.test(hostname) || isLoopbackAddress(hostname);
}
