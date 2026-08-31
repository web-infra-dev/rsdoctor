import { getSDK, setSDK } from '@/inner-plugins/utils/sdk';
import type { SDK } from '@rsdoctor/shared/types';
import { afterEach, describe, expect, it } from 'rstack/test';

function createMultipleSDKs() {
  const createSlave = (name: string, compilerPath = '') =>
    ({
      name,
      compilerPath,
    }) as SDK.RsdoctorBuilderSDKInstance & { compilerPath: string };
  const webSDK = createSlave('web');
  const nodeSDK = createSlave('node');
  const controller = {
    slaves: [webSDK, nodeSDK],
  };
  Object.assign(webSDK, { parent: controller });
  Object.assign(nodeSDK, { parent: controller });
  return { controller, createSlave, webSDK, nodeSDK };
}

function createSDK(name: string) {
  return { name } as SDK.RsdoctorBuilderSDKInstance;
}

describe('SDK registry', () => {
  afterEach(() => {
    globalThis.__rsdoctor_sdk__ = undefined;
    globalThis.__rsdoctor_sdks__ = undefined;
  });

  it('returns the named SDK instead of the last registered SDK', () => {
    const webSDK = createSDK('web');
    const nodeSDK = createSDK('node');

    setSDK(webSDK);
    setSDK(nodeSDK);

    expect(getSDK('web')).toBe(webSDK);
    expect(getSDK('node')).toBe(nodeSDK);
  });

  it('finds sibling SDKs from the controller', () => {
    const rootSDK = createSDK('root');
    const slaveSDK = createSDK('web');
    Object.assign(rootSDK, {
      parent: { slaves: [rootSDK, slaveSDK] },
    });

    setSDK(rootSDK);

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
