import type { IncomingMessage, ServerResponse } from 'http';

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

export function isLocalOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      LOCAL_HOSTNAMES.has(url.hostname)
    );
  } catch {
    return false;
  }
}

export function isAllowedRequestOrigin(origin: string | string[] | undefined) {
  if (origin === undefined) {
    return true;
  }

  return typeof origin === 'string' && isLocalOrigin(origin);
}

export function getAllowedCorsOrigin(origin: string | string[] | undefined) {
  return typeof origin === 'string' && isLocalOrigin(origin)
    ? origin
    : undefined;
}

export function setCorsHeaders(req: IncomingMessage, res: ServerResponse) {
  const origin = getAllowedCorsOrigin(req.headers.origin);
  if (!origin) {
    return false;
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  return true;
}
