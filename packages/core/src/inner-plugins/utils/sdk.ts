import { RsdoctorWebpackSDK } from '@rsdoctor/sdk';

let sdk: RsdoctorWebpackSDK;

export function setSDK(t: RsdoctorWebpackSDK) {
  sdk = t;
}

export function getSDK(): RsdoctorWebpackSDK {
  return sdk;
}
