import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { fetchText, loadJSON } from './utils';

describe('cli utils', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetchText() returns response text for 2xx', async () => {
    const fetchMock = rs.fn().mockResolvedValue({
      ok: true,
      text: async () => 'plain text',
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const result = await fetchText('https://example.com/file.txt');

    expect(result).toBe('plain text');
    expect(fetchMock).toBeCalledTimes(1);
    expect(fetchMock).toBeCalledWith(
      'https://example.com/file.txt',
      expect.objectContaining({
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Accept-Encoding': 'gzip,deflate,compress',
        },
      }),
    );
  });

  it('fetchText() throws when response is non-2xx', async () => {
    const fetchMock = rs.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(fetchText('https://example.com/missing.txt')).rejects.toThrow(
      'Request failed with status 404',
    );
  });

  it('loadJSON() parses remote json text', async () => {
    const fetchMock = rs.fn().mockResolvedValue({
      ok: true,
      text: async () => '{"id":7,"name":"remote"}',
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const data = await loadJSON<{ id: number; name: string }>(
      'https://example.com/data.json',
      process.cwd(),
    );

    expect(data).toStrictEqual({ id: 7, name: 'remote' });
  });
});
