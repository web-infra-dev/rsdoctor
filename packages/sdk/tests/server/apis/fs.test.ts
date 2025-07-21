import { describe, it, rs, expect } from '@rstest/core';
import { SDK } from '@rsdoctor/types';
import { setupSDK } from '../../utils';

describe('test server/apis/fs.ts', () => {
  const target = setupSDK();

  it(`test api: ${SDK.ServerAPI.API.ApplyErrorFix}`, async () => {
    const spy = rs
      .spyOn(target.sdk, 'applyErrorFix')
      .mockImplementation(async () => {});

    await target.post(SDK.ServerAPI.API.ApplyErrorFix, { id: 111 } as any);

    expect(spy).toBeCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(111);

    spy.mockRestore();
  });
});
