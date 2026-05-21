import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { fetchJSONByUrl, postServerAPI } from './request';

describe('request utils', () => {
  const originalFetch = globalThis.fetch;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('fetchJSONByUrl() parses json text payload', async () => {
    const fetchMock = rs.fn().mockResolvedValue({
      ok: true,
      text: async () => '{"name":"rsdoctor"}',
    });
    globalThis.fetch = fetchMock as typeof fetch;
    process.env.NODE_ENV = 'production';

    const data = await fetchJSONByUrl('https://example.com/manifest.json');

    expect(data).toStrictEqual({ name: 'rsdoctor' });
    expect(fetchMock).toBeCalledTimes(1);
  });

  it('fetchJSONByUrl() throws for non-2xx response', async () => {
    const fetchMock = rs.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    globalThis.fetch = fetchMock as typeof fetch;
    process.env.NODE_ENV = 'production';

    await expect(
      fetchJSONByUrl('https://example.com/manifest.json'),
    ).rejects.toThrow('Request failed with status 500');
  });

  it('postServerAPI() sends json body and parses response json', async () => {
    const fetchMock = rs.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    globalThis.fetch = fetchMock as typeof fetch;
    process.env.NODE_ENV = 'production';

    const result = await (postServerAPI as any)('/api/demo', { id: 1 });
    const [url, init] = fetchMock.mock.calls[0];

    expect(url).toContain('/api/demo?_t=');
    expect(init).toMatchObject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: 1 }),
    });
    expect(result).toStrictEqual({ ok: true });
  });
});
