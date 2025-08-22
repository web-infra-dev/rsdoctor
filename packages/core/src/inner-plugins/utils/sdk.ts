import { RsdoctorPrimarySDK, RsdoctorSDK } from '@rsdoctor/sdk';

const globalKey = '__rsdoctor_sdks__';

// Extend the globalThis type to avoid TS errors for dynamic properties
declare global {
  var __rsdoctor_sdks__: RsdoctorSDK[] | undefined;
  var __rsdoctor_sdk__: RsdoctorSDK | undefined;
}

export function setSDK(t: RsdoctorSDK) {
  if (!globalThis.__rsdoctor_sdks__) {
    globalThis.__rsdoctor_sdks__ = [];
  }
  globalThis.__rsdoctor_sdks__!.push(t);
  globalThis.__rsdoctor_sdk__ = t;
}

export function getSDK(builderName?: string) {
  const sdks = globalThis[globalKey] || [];
  let sdk = globalThis['__rsdoctor_sdk__'];

  if (sdk && sdk.name !== builderName) {
    sdk = builderName ? sdks.find((s) => s.name === builderName) || sdk : sdk;
  }
  if (sdk && builderName && 'parent' in sdk) {
    const _sdk = sdk as RsdoctorPrimarySDK;
    const slaveSDK = _sdk.parent.slaves.find(
      (_sdk: { name: string }) => _sdk.name === builderName,
    );
    return slaveSDK || sdk;
  }
  return sdk;
}
