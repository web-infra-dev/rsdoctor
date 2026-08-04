import { afterEach, describe, expect, it } from '@rstest/core';
import type { SDK } from '@rsdoctor/shared/types';
import { getSDK, setSDK } from '@/inner-plugins/utils/sdk';

const createSDK = (name: string) =>
  ({ name }) as SDK.RsdoctorBuilderSDKInstance;

afterEach(() => {
  delete globalThis.__rsdoctor_sdk__;
  delete globalThis.__rsdoctor_sdks__;
});

describe('SDK registry', () => {
  it('returns the latest SDK by default and finds named SDKs', () => {
    const webSDK = createSDK('web');
    const web1SDK = createSDK('web1');

    setSDK(webSDK);
    setSDK(web1SDK);

    expect(getSDK()).toBe(web1SDK);
    expect(getSDK('web')).toBe(webSDK);
    expect(getSDK('web1')).toBe(web1SDK);
  });

  it('finds named SDKs from a parent SDK', () => {
    const slaveSDK = createSDK('web');
    const parentSDK = {
      name: 'parent',
      parent: {
        slaves: [slaveSDK],
      },
    } as unknown as SDK.RsdoctorBuilderSDKInstance;

    setSDK(parentSDK);

    expect(getSDK('web')).toBe(slaveSDK);
  });

  it('does not register the same SDK more than once', () => {
    const sdk = createSDK('web');

    setSDK(sdk);
    setSDK(sdk);

    expect(globalThis.__rsdoctor_sdks__).toEqual([sdk]);
  });

  it('replaces a recreated SDK with the same compiler name', () => {
    const previous = createSDK('web');
    const current = createSDK('web');

    setSDK(previous);
    setSDK(current);

    expect(globalThis.__rsdoctor_sdks__).toEqual([current]);
    expect(getSDK('web')).toBe(current);
  });
});
