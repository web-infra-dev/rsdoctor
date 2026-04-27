import { describe, it, expect, rs } from '@rstest/core';
import { SDK } from '@rsdoctor/types';

import { APIDataLoader } from '../../src/common/data';

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

    const loader = new APIDataLoader({
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

    const loader = new APIDataLoader({
      loadData: fn,
      loadManifest: rs.fn().mockImplementation(() => new Promise(() => {})),
    });

    excludeAPIs.forEach((api) => {
      expect(() => loader.loadAPI(api)).toThrowError(
        `API not implement: "${api}"`,
      );
    });
  });

  it('loads runtime performance api data from store data', async () => {
    const runtime = {
      vitals: [
        {
          name: 'LCP',
          value: 1200,
          rating: 'good',
          delta: 1200,
          id: 'v1',
          navigationType: 'navigate',
          entries: [],
          timestamp: 1,
        },
      ],
      resourceTimings: [
        {
          name: 'http://localhost/main.js',
          initiatorType: 'script',
          startTime: 10,
          duration: 20,
          transferSize: 1024,
          decodedBodySize: 2048,
          encodedBodySize: 1024,
          domainLookupStart: 1,
          domainLookupEnd: 2,
          connectStart: 2,
          connectEnd: 3,
          requestStart: 4,
          responseStart: 5,
          responseEnd: 30,
          fromCache: false,
          nextHopProtocol: 'h2',
          timestamp: 2,
        },
      ],
    } satisfies SDK.RuntimePerfData;

    const loader = new APIDataLoader({
      loadData: rs.fn().mockImplementation((key) => {
        if (key === 'runtime') {
          return Promise.resolve(runtime);
        }
        return Promise.resolve(undefined);
      }),
      loadManifest: rs.fn(),
    });

    await expect(loader.loadAPI(SDK.ServerAPI.API.GetWebVitals)).resolves.toBe(
      runtime,
    );
    await expect(
      loader.loadAPI(SDK.ServerAPI.API.GetResourceTimings),
    ).resolves.toBe(runtime.resourceTimings);
  });
});
