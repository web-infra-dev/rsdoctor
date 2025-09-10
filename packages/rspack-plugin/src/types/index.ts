import type { Plugin } from '@rsdoctor/types';
import type { RspackPluginInstance } from '@rspack/core';

export interface RsdoctorRspackPluginOptions {
  /**
   * turn on it if you don't need to see profile in browser.
   * @default false
   */
  disableClientServer?: boolean;
  /**
   * the switch for the Rsdoctor features.
   */
  features?: Plugin.RsdoctorWebpackPluginOptions<[]>['features'];
  /**
   * configuration of the interceptor for webpack loaders.
   * @description worked when the `features.loader === true`.
   */
  loaderInterceptorOptions?: Plugin.RsdoctorWebpackPluginOptions<
    []
  >['loaderInterceptorOptions'];
}

export interface RsdoctorRspackPluginInstance extends RspackPluginInstance {
  readonly name: string;
}
