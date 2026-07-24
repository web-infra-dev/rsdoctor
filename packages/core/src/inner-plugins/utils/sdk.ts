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
  if (!globalThis.__rsdoctor_sdks__.includes(t)) {
    globalThis.__rsdoctor_sdks__.push(t);
  }
  if (asDefault) {
    globalThis.__rsdoctor_sdk__ = t;
  }
}

export function getSDK(compilerId?: string) {
  const sdks = globalThis[globalKey] || [];
  let sdk = globalThis['__rsdoctor_sdk__'];

  if (compilerId) {
    sdk =
      sdks.find(
        (item) =>
          item.name === compilerId ||
          ('compilerPath' in item && item.compilerPath === compilerId),
      ) || sdk;
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
    const slaveSDK = parent?.slaves.find(
      (item) => item.name === compilerId || item.compilerPath === compilerId,
    );
    return slaveSDK || sdk;
  }
  return sdk;
}
