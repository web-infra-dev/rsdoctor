import { describe, it, expect, rs } from 'rstack/test';
import { Data } from '../../src/common-browser';
import { SDK } from '../../src/types';

describe('test src/common/data/index.ts', () => {
  const excludeAPIs = [
    SDK.ServerAPI.API.ApplyErrorFix,
    SDK.ServerAPI.API.Env,
    SDK.ServerAPI.API.EntryHtml,
    SDK.ServerAPI.API.Manifest,
    SDK.ServerAPI.API.ReportLoader,
    SDK.ServerAPI.API.ReportSourceMap,
    SDK.ServerAPI.API.SendAPIDataToClient,
  ];

  const testAPIs = Object.values(SDK.ServerAPI.API).filter(
    (e) => !excludeAPIs.includes(e),
  );

  it('ensure implement api with server and client', () => {
    const fn = rs.fn().mockImplementation(() => new Promise(() => {}));

    const loader = new Data.APIDataLoader({
      loadData: fn,
      loadManifest: rs.fn().mockImplementation(() => new Promise(() => {})),
    });

    testAPIs.forEach((api) => {
      if (api === SDK.ServerAPI.API.LoadDataByKey) {
        // SDK.ServerAPI.API.LoadDataByKey must set body to avoid error
        expect(loader.loadAPI(api, { key: 'hash' })).toBeInstanceOf(Promise);
      } else {
        expect(loader.loadAPI(api)).toBeInstanceOf(Promise);
      }
    });
  });

  it('ensure api not implement with server and client', () => {
    const fn = rs.fn();

    const loader = new Data.APIDataLoader({
      loadData: fn,
      loadManifest: rs.fn().mockImplementation(() => new Promise(() => {})),
    });

    excludeAPIs.forEach((api) => {
      expect(() => loader.loadAPI(api)).toThrowError(
        `API not implement: "${api}"`,
      );
    });
  });

  it('returns the current compiler display name for project info', async () => {
    const name = 'child-worker-loader-long-request';
    const displayName = 'worker-loader: prime.worker.ts';
    const loader = new Data.APIDataLoader({
      loadData: rs
        .fn()
        .mockImplementation(async (key) =>
          key === 'configs' ? [{ config: { name } }] : undefined,
        ),
      loadManifest: rs.fn().mockResolvedValue({
        name,
        series: [{ name, displayName }],
      }),
    });

    await expect(
      loader.loadAPI(SDK.ServerAPI.API.GetProjectInfo),
    ).resolves.toMatchObject({ name, displayName });
  });
});
