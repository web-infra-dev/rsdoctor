import { describe, it, expect, rs } from '@rstest/core';
import { SDK } from '@rsdoctor/types';
import { setupSDK } from '../../utils';
import { BaseAPI } from '../../../src/sdk/server/apis/base';

rs.setConfig({ testTimeout: 50000 });

describe('test server/apis/data.ts', () => {
  const target = setupSDK();

  it(`test api: ${SDK.ServerAPI.API.ReportLoader}`, async () => {
    const spy = rs
      .spyOn(target.sdk, 'reportLoader')
      .mockImplementation(() => {});

    await target.post(SDK.ServerAPI.API.ReportLoader, { a: 1 } as any);

    expect(spy).toBeCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ a: 1 });

    spy.mockRestore();
  });

  it('keeps internal safe dotted data paths available', async () => {
    const modules = [{ id: 1 }];
    const api = new BaseAPI(
      {
        getStoreData: () => ({
          moduleGraph: {
            modules,
          },
        }),
      } as any,
      {} as any,
    );

    await expect(api.loadData('moduleGraph.modules')).resolves.toBe(modules);
    await expect(api.loadData('moduleGraph.__proto__' as any)).resolves.toBe(
      undefined,
    );
    await expect(
      api.loadData('moduleGraph.modules.length' as any),
    ).resolves.toBe(undefined);
  });
});
