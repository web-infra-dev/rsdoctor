import { SDK } from '@rsdoctor/shared/types';

const globalKey = '__rsdoctor_sdks__';

// Extend the globalThis type to avoid TS errors for dynamic properties
declare global {
  var __rsdoctor_sdks__: SDK.RsdoctorBuilderSDKInstance[] | undefined;
  var __rsdoctor_sdk__: SDK.RsdoctorBuilderSDKInstance | undefined;
}

export function setSDK(t: SDK.RsdoctorBuilderSDKInstance) {
  registerSDK(t, true);
}

export function registerSDK(
  t: SDK.RsdoctorBuilderSDKInstance,
  asDefault = false,
) {
  if (!globalThis.__rsdoctor_sdks__) {
    globalThis.__rsdoctor_sdks__ = [];
  }
  const sameNameIndex = globalThis.__rsdoctor_sdks__.findIndex(
    (sdk) => sdk.name === t.name,
  );
  if (sameNameIndex >= 0) {
    globalThis.__rsdoctor_sdks__[sameNameIndex] = t;
  } else if (!globalThis.__rsdoctor_sdks__.includes(t)) {
    globalThis.__rsdoctor_sdks__.push(t);
  }
  if (asDefault) {
    globalThis.__rsdoctor_sdk__ = t;
  }
}

function findMatchingSDK(
  sdks: SDK.RsdoctorBuilderSDKInstance[],
  compilerId: string,
) {
  const exactMatch = sdks.find(
    (item) =>
      item.name === compilerId ||
      ('compilerPath' in item && item.compilerPath === compilerId),
  );
  if (exactMatch) {
    return exactMatch;
  }

  const compilerName = compilerId.split('|', 1)[0];
  if (compilerName && compilerName !== compilerId) {
    return sdks.find((item) => item.name === compilerName);
  }
}

export function getSDK(compilerId?: string) {
  const sdks = globalThis[globalKey] || [];
  let sdk = globalThis['__rsdoctor_sdk__'];

  if (compilerId) {
    sdk = findMatchingSDK(sdks, compilerId) || sdk;
  }
  if (sdk && compilerId && 'parent' in sdk) {
    const parent = (
      sdk as SDK.RsdoctorBuilderSDKInstance & {
        parent?: {
          slaves: Array<
            SDK.RsdoctorBuilderSDKInstance & { compilerPath?: string }
          >;
        };
      }
    ).parent;
    const slaveSDK = parent && findMatchingSDK(parent.slaves, compilerId);
    return slaveSDK || sdk;
  }
  return sdk;
}
