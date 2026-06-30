import { describe, expect, it, rs } from '@rstest/core';
import { setupSDK } from '../../utils';

describe('test hooks of sdk/core.ts', () => {
  const target = setupSDK();

  it(`test hook: afterSaveManifest`, async () => {
    const fn1 = rs.fn();
    const fn2 = rs.fn();

    target.sdk.hooks.afterSaveManifest.tapPromise('AAA', async (arg) =>
      fn1(arg),
    );
    target.sdk.hooks.afterSaveManifest.tapPromise('BBB', async (arg) =>
      fn2(arg),
    );

    expect(fn1).not.toBeCalled();
    expect(fn2).not.toBeCalled();

    await target.sdk.writeStore();

    expect(fn1).toBeCalledTimes(1);
    expect(fn1).toHaveBeenCalledWith({
      manifestWithShardingFiles: target.sdk.cloudData,
      manifestDiskPath: target.sdk.diskManifestPath,
    });
    expect(fn2).toBeCalledTimes(1);
    expect(fn2).toHaveBeenCalledWith({
      manifestWithShardingFiles: target.sdk.cloudData,
      manifestDiskPath: target.sdk.diskManifestPath,
    });
  });
});
