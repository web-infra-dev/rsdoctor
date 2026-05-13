import { describe, it, expect, rs } from '@rstest/core';
import { SDK } from '@rsdoctor/types';
import { DataAPI } from '../../../src/sdk/server/apis/data';
import { setupSDK } from '../../utils';

rs.setConfig({ testTimeout: 50000 });

describe('test server/apis/data.ts', () => {
  const target = setupSDK();

  it('loads store data by manifest key', async () => {
    const api = new DataAPI(
      {
        getStoreData: () => ({
          root: process.cwd(),
          moduleGraph: {
            modules: [{ id: 1 }],
          },
        }),
      } as any,
      {} as any,
    );

    await expect(api.loadData('root')).resolves.toEqual(process.cwd());
    await expect(api.loadData('moduleGraph.modules')).resolves.toEqual([
      { id: 1 },
    ]);
  });

  it('does not load data from deep object paths', async () => {
    const api = new DataAPI(
      {
        getStoreData: () => ({
          summary: {
            nested: {
              value: 'private',
            },
          },
        }),
      } as any,
      {} as any,
    );

    await expect(api.loadData('summary.nested.value' as any)).resolves.toBe(
      undefined,
    );
  });

  it('does not load data from prototype paths', async () => {
    const api = new DataAPI(
      {
        getStoreData: () => ({
          root: process.cwd(),
        }),
      } as any,
      {} as any,
    );

    await expect(api.loadData('constructor.name' as any)).resolves.toBe(
      undefined,
    );
  });

  it(`test api: ${SDK.ServerAPI.API.ReportLoader}`, async () => {
    const spy = rs
      .spyOn(target.sdk, 'reportLoader')
      .mockImplementation(() => {});

    await target.post(SDK.ServerAPI.API.ReportLoader, { a: 1 } as any);

    expect(spy).toBeCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ a: 1 });

    spy.mockRestore();
  });
});
