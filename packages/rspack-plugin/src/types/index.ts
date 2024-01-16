import type { RspackPluginInstance } from '@rspack/core';
import type { RsdoctorWebpackPluginOptions } from '@rsdoctor/core/types';

export interface RsdoctorRspackPluginOptions {
  /**
   * turn on it if you don't need to see profile in browser.
   * @default false
   */
  disableClientServer?: boolean;
  /**
   * the switch for the Rsdoctor features.
   */
  features?: RsdoctorWebpackPluginOptions<[]>['features'];
  /**
   * configuration of the interceptor for webpack loaders.
   * @description worked when the `features.loader === true`.
   */
  loaderInterceptorOptions?: RsdoctorWebpackPluginOptions<
    []
  >['loaderInterceptorOptions'];
}

export interface RsdoctorRspackPluginInstance
  extends RspackPluginInstance {
  readonly name: string;
}
