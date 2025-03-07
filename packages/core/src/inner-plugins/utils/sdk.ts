import { RsdoctorPrimarySDK, RsdoctorSDK } from '@rsdoctor/sdk';

let sdks: RsdoctorSDK[] = [];
let sdk: RsdoctorSDK;

export function setSDK(t: RsdoctorSDK) {
  sdks.push(t);
  sdk = t;
}

export function getSDK(builderName?: string) {
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
