export function getFetch(): typeof fetch {
  const currentFetch = globalThis.fetch;
  if (typeof currentFetch !== 'function') {
    throw new Error('fetch is not available in this environment');
  }

  return currentFetch.bind(globalThis);
}

export interface FetchOptions {
  timeout?: number;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

export async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {},
): Promise<Response> {
  const { timeout = 30000, signal: externalSignal, ...init } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', () => controller.abort(), {
        once: true,
      });
    }
  }

  const fetchImpl = getFetch();
  try {
    const res = await fetchImpl(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}`);
    }
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function postJSON(
  url: string,
  body: unknown,
  timeout = 30000,
): Promise<Response> {
  return fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    timeout,
  });
}
