import { afterEach, describe, expect, it, rs } from '@rstest/core';

const { fetchWithTimeoutMock } = rs.hoisted(() => ({
  fetchWithTimeoutMock: rs.fn(),
}));

rs.mock('./fetch-http', () => ({
  fetchWithTimeout: fetchWithTimeoutMock,
}));

import { fetchText, loadJSON } from './utils';

describe('cli utils', () => {
  afterEach(() => {
    fetchWithTimeoutMock.mockReset();
  });

  it('fetchText() returns response text for 2xx', async () => {
    fetchWithTimeoutMock.mockResolvedValue({
      ok: true,
      text: async () => 'plain text',
    } as Response);

    const result = await fetchText('https://example.com/file.txt');

    expect(result).toBe('plain text');
    expect(fetchWithTimeoutMock).toBeCalledTimes(1);
    expect(fetchWithTimeoutMock).toBeCalledWith(
      'https://example.com/file.txt',
      expect.objectContaining({
        timeout: 60000,
        headers: {
          Accept: 'text/plain; charset=utf-8',
          'Accept-Encoding': 'gzip,deflate,compress',
        },
      }),
    );
  });

  it('fetchText() throws when response is non-2xx', async () => {
    fetchWithTimeoutMock.mockRejectedValue(
      new Error('Request failed with status 404'),
    );

    await expect(fetchText('https://example.com/missing.txt')).rejects.toThrow(
      'Request failed with status 404',
    );
  });

  it('loadJSON() parses remote json text', async () => {
    fetchWithTimeoutMock.mockResolvedValue({
      ok: true,
      text: async () => '{"id":7,"name":"remote"}',
    } as Response);

    const data = await loadJSON<{ id: number; name: string }>(
      'https://example.com/data.json',
      process.cwd(),
    );

    expect(data).toStrictEqual({ id: 7, name: 'remote' });
  });
});
