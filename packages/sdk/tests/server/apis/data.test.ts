import { describe, it, expect, rs } from '@rstest/core';
import { SDK } from '@rsdoctor/types';
import { setupSDK } from '../../utils';

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

  it('rejects invalid data keys', async () => {
    const res = await target.post(SDK.ServerAPI.API.LoadDataByKey, {
      key: '__proto__.polluted',
    } as never);

    expect(res.text).toBe('Invalid data key: __proto__.polluted');
  });
});
