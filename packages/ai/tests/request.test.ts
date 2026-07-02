import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { SDK } from '@rsdoctor/shared/types';
import { sendRequest } from '../src/server/request';

describe('http transport', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sendRequest() posts JSON to the local Rsdoctor server', async () => {
    const fetchMock = rs.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ value: 'ok' }),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const res = await sendRequest(SDK.ServerAPI.API.GetChunkGraphAI, {
      limit: 3,
    });
    const [url, init] = fetchMock.mock.calls[0];
    const parsedUrl = new URL(url);

    expect(parsedUrl.hostname).toBe('localhost');
    expect(parsedUrl.pathname).toBe(SDK.ServerAPI.API.GetChunkGraphAI);
    expect(init).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 3 }),
    });
    expect(res).toStrictEqual({ value: 'ok' });
  });
});
