import type { Manifest } from '@rsdoctor/shared/types';
import { beforeEach, describe, expect, it, rs } from 'rstack/test';
import { loadReportManifest } from '../src/webmcp/load-report';

const { fetchManifest, postServerAPI } = rs.hoisted(() => ({
  fetchManifest: rs.fn(),
  postServerAPI: rs.fn(),
}));

rs.mock('../src/utils/request', () => ({
  fetchManifest,
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

    expect(postServerAPI).toHaveBeenCalledTimes(keys.length);
    for (const key of keys) {
      expect(postServerAPI).toHaveBeenCalledWith('/api/data/key', { key });
      expect(manifest.data[key as keyof Manifest.RsdoctorManifestData]).toEqual(
        { key },
      );
    }
    expect(manifest.data.hash).toBe('build-hash');
  });

  it('loads only the WebMCP data keys from static report shards', async () => {
    const manifest = {
      client: { enableRoutes: [] },
      data: {
        hash: 'build-hash',
        chunkGraph: { assets: [] },
        moduleGraph: { modules: [] },
        packageGraph: { packages: [] },
        errors: [],
        summary: { costs: [] },
        moduleCodeMap: { unused: true },
      },
    };
    fetchManifest.mockResolvedValue(manifest);

    expect(await loadReportManifest()).toEqual({
      ...manifest,
      data: {
        hash: 'build-hash',
        chunkGraph: { assets: [] },
        moduleGraph: { modules: [] },
        packageGraph: { packages: [] },
        errors: [],
        summary: { costs: [] },
      },
    });
    expect(postServerAPI).not.toHaveBeenCalled();
  });
});
