import { describe, expect, it } from '@rstest/core';
import { DataAPI } from '../../../src/sdk/server/apis/data';

function createDataAPI(key: unknown) {
  const storeData = {
    root: '/project',
    moduleGraph: {
      modules: [{ id: 1 }],
    },
  };
  const api = new DataAPI(
    {
      getManifestData: () => ({
        data: {
          root: '/api/data/key/root',
          moduleGraph: ['/api/data/key/moduleGraph'],
        },
      }),
      getStoreData: () => storeData,
    } as any,
    {} as any,
  );
  const res = { statusCode: 200 };

  Object.defineProperty(api, 'ctx', {
    value: {
      sdk: {
        getManifestData: () => ({
          data: {
            root: '/api/data/key/root',
            moduleGraph: ['/api/data/key/moduleGraph'],
          },
        }),
        getStoreData: () => storeData,
      },
      server: {},
      req: {
        body: { key },
      },
      res,
    },
  });

  return { api, res };
}

describe('test server/apis/data key guard', () => {
  it('allows public manifest root keys', async () => {
    const { api, res } = createDataAPI('root');

    await expect(api.loadDataByKey()).resolves.toBe('/project');
    expect(res.statusCode).toBe(200);
  });

  it('rejects private or unsafe public keys', async () => {
    for (const key of [
      'moduleGraph.modules',
      '__proto__',
      'constructor.prototype',
      'moduleGraph.__proto__',
    ]) {
      const { api, res } = createDataAPI(key);

      await expect(api.loadDataByKey()).resolves.toBe(undefined);
      expect(res.statusCode).toBe(403);
    }
  });
});
