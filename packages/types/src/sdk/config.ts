import type { Configuration as RspackConfiguration } from '@rspack/core';

type RspackConfigurationWrapper = any extends RspackConfiguration
  ? never
  : RspackConfiguration;

export interface BundlerConfigData {
  name: string;
  version: string | number;
  bin?: string;
  config: RspackConfigurationWrapper;
  root: string;
}

export type ConfigData = BundlerConfigData[];
