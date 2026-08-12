import { afterEach, describe, expect, it } from '@rstest/core';
import type { SDK } from '@rsdoctor/shared/types';
import { getSDK, setSDK } from '@/inner-plugins/utils/sdk';

const createSDK = (name: string) =>
  ({ name }) as SDK.RsdoctorBuilderSDKInstance;

const createMultipleSDKs = () => {
  const controller = {
    slaves: [] as Array<
      SDK.RsdoctorBuilderSDKInstance & { compilerPath: string }
    >,
  };
  const createSlave = (name: string, compilerPath = '') =>
    ({
      name,
      compilerPath,
      parent: controller,
    }) as unknown as SDK.RsdoctorBuilderSDKInstance & {
      compilerPath: string;
    };
  const webSDK = createSlave('web');
  const nodeSDK = createSlave('node');
  controller.slaves.push(webSDK, nodeSDK);

  return { controller, createSlave, webSDK, nodeSDK };
};

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

  it('falls back to the root compiler name for compiler paths', () => {
    const { webSDK, nodeSDK } = createMultipleSDKs();

    setSDK(webSDK);
    setSDK(nodeSDK);

    expect(getSDK('web|')).toBe(webSDK);
    expect(getSDK('web|unregistered-child|0|')).toBe(webSDK);
  });

  it('prefers an exact child compiler path over the root compiler name', () => {
    const { controller, createSlave, webSDK, nodeSDK } = createMultipleSDKs();
    const childSDK = createSlave('child-web-child-0-', 'web|child|0|');
    controller.slaves.push(childSDK);

    setSDK(webSDK);
    setSDK(nodeSDK);

    expect(getSDK('web|child|0|')).toBe(childSDK);
  });
});
