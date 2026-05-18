import { SDK } from '@rsdoctor/types';

export interface DataWithUrl {
  name: string;
  files:
    | {
        path: string;
        basename: string;
        content: Buffer;
      }[]
    | string;
}

export interface RsdoctorSDKOptions {
  name: string;
  root: string;
  type?: SDK.ToDataType;
  /**
   * port for client server
   */
  port?: number;
  config?: SDK.SDKOptionsType;
}

export interface RsdoctorBuilderSDK extends RsdoctorSDKOptions {}

export interface RsdoctorEMOSDKOptions extends RsdoctorSDKOptions {}
