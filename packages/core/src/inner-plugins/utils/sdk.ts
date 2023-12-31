import { DoctorWebpackSDK } from '@rsdoctor/sdk';

let sdk: DoctorWebpackSDK;

export function setSDK(t: DoctorWebpackSDK) {
  sdk = t;
}

export function getSDK(): DoctorWebpackSDK {
  return sdk;
}
