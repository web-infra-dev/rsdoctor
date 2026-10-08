import type { Manifest } from '@rsdoctor/shared/types';
import { beforeEach, describe, expect, it, rs } from 'rstack/test';
import { loadReportManifest } from '../src/webmcp/load-report';

const { fetchManifest, parseManifest, postServerAPI } = rs.hoisted(() => ({
  fetchManifest: rs.fn(),
  parseManifest: rs.fn(),
  postServerAPI: rs.fn(),
}));

rs.mock('../src/utils/request', () => ({
  fetchManifest,
  parseManifest,
  postServerAPI,
}));

describe('WebMCP report loading', () => {
  beforeEach(() => {
    rs.clearAllMocks();
  });

  it('loads local report keys using the server POST API instead of static shard GETs', async () => {
    const keys = [
      'chunkGraph',
      'moduleGraph',
      'packageGraph',
      'errors',
      'summary',
    ];
    fetchManifest.mockResolvedValue({
      client: { enableRoutes: [] },
      __LOCAL__SERVER__: true,
      data: Object.fromEntries([
        ['hash', 'build-hash'],
        ...keys.map((key) => [
          key,
          [`http://localhost:9988/api/data/key/${key}`],
        ]),
      ]),
    });
    postServerAPI.mockImplementation(async (_api, { key }) => ({ key }));

    const manifest = await loadReportManifest();

    expect(parseManifest).not.toHaveBeenCalled();
    expect(postServerAPI).toHaveBeenCalledTimes(keys.length);
    for (const key of keys) {
      expect(postServerAPI).toHaveBeenCalledWith('/api/data/key', { key });
      expect(manifest.data[key as keyof Manifest.RsdoctorManifestData]).toEqual(
        { key },
      );
    }
    expect(manifest.data.hash).toBe('build-hash');
  });

  it('keeps static report shard parsing', async () => {
    const manifest = { client: { enableRoutes: [] }, data: {} };
    fetchManifest.mockResolvedValue(manifest);
    parseManifest.mockResolvedValue(manifest);

    expect(await loadReportManifest()).toBe(manifest);
    expect(parseManifest).toHaveBeenCalledWith(manifest);
    expect(postServerAPI).not.toHaveBeenCalled();
  });
});
