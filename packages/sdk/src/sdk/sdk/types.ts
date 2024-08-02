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
}

/**
 * sdk options for builder.
 */
export interface RsdoctorBuilderSDK extends RsdoctorSDKOptions {
  type?: SDK.ToDataType;
  /**
   * port for client server
   */
  port?: number;
  config?: SDK.SDKOptionsType;
}

export interface RsdoctorWebpackSDKOptions extends RsdoctorBuilderSDK {}

export interface RsdoctorEMOSDKOptions extends RsdoctorSDKOptions {}
