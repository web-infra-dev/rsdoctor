import { afterEach, describe, expect, it, rs } from '@rstest/core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const { fetchWithTimeoutMock } = rs.hoisted(() => ({
  fetchWithTimeoutMock: rs.fn(),
}));

rs.mock('./fetch-http', () => ({
  fetchWithTimeout: fetchWithTimeoutMock,
}));

import { fetchText, loadJSON } from './utils';
import { loadShardingFile, loadShardingFileWithSpinner } from './utils';

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

  it('loadJSON() parses local json file', async () => {
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'rsdoctor-cli-utils-'),
    );
    const file = path.join(tempDir, 'data.json');
    fs.writeFileSync(file, '{"id":8,"name":"local"}', 'utf-8');

    const data = await loadJSON<{ id: number; name: string }>(
      'data.json',
      tempDir,
    );

    expect(data).toStrictEqual({ id: 8, name: 'local' });
  });

  it('loadShardingFile() supports url, filepath and raw text', async () => {
    fetchWithTimeoutMock.mockResolvedValue({
      ok: true,
      text: async () => 'remote-content',
    } as Response);

    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'rsdoctor-cli-sharding-'),
    );
    const file = path.join(tempDir, 'local.txt');
    fs.writeFileSync(file, 'local-content', 'utf-8');

    await expect(
      loadShardingFile('https://example.com/sharding.txt', process.cwd()),
    ).resolves.toBe('remote-content');
    await expect(loadShardingFile(file, tempDir)).resolves.toBe(
      'local-content',
    );
    await expect(
      loadShardingFile('inline-content', process.cwd()),
    ).resolves.toBe('inline-content');
  });

  it('loadShardingFileWithSpinner() updates spinner text', async () => {
    const spinner = { text: '' };

    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'rsdoctor-cli-spinner-'),
    );
    const file = path.join(tempDir, 'local.txt');
    fs.writeFileSync(file, 'spinner-content', 'utf-8');

    const content = await loadShardingFileWithSpinner(
      file,
      tempDir,
      spinner as any,
    );

    expect(content).toBe('spinner-content');
    expect(spinner.text).toBe(`loaded "${file}"`);
  });
});
