import { RsdoctorPrimarySDK, RsdoctorSDK } from '@rsdoctor/sdk';

let sdk: RsdoctorSDK;

export function setSDK(t: RsdoctorSDK) {
  sdk = t;
}

export function getSDK(builderName?: string) {
  if (sdk && builderName && 'parent' in sdk) {
    const _sdk = sdk as unknown as RsdoctorPrimarySDK;
    const slaveSDK = _sdk.parent.slaves.find(
      (_sdk: { name: string }) => _sdk.name === builderName,
    );
    return slaveSDK || sdk;
  }
  return sdk;
}
