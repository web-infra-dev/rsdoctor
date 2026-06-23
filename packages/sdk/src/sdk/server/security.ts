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

function getHostnameFromOrigin(origin: string) {
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return hostname.startsWith('[') && hostname.endsWith(']')
      ? hostname.slice(1, -1)
      : hostname;
  } catch {
    return '';
  }
}

function isIpAddress(hostname: string) {
  return isIP(hostname) !== 0;
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
  return LOCAL_HOSTNAMES.test(hostname) || isIpAddress(hostname);
}

export function isAllowedCorsRequest(
  origin: string | string[] | undefined,
  host: string | string[] | undefined,
) {
  if (origin === undefined) {
    return true;
  }
  if (
    typeof origin !== 'string' ||
    typeof host !== 'string' ||
    !isAllowedRequestOrigin(origin)
  ) {
    return false;
  }

  const originHostname = getHostnameFromOrigin(origin);
  const hostHostname = getHostnameFromHost(host).toLowerCase();

  if (originHostname.endsWith('.localhost')) {
    return originHostname === hostHostname;
  }

  return true;
}
