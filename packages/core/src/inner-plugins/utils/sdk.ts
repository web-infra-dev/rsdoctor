import { RsdoctorSlaveSDK, RsdoctorWebpackSDK } from '@rsdoctor/sdk';

let sdk: RsdoctorWebpackSDK;

export function setSDK(t: RsdoctorWebpackSDK) {
  sdk = t;
}

export function getSDK(builderName?: string) {
  if (sdk && builderName && 'parent' in sdk) {
    const _sdk = sdk as unknown as RsdoctorSlaveSDK;
    const slaveSDK = _sdk.parent.slaves.find(
      (_sdk: { name: string }) => _sdk.name === builderName,
    );
    return slaveSDK || sdk;
  }
  return sdk;
}
