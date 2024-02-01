import type { Configuration } from 'webpack';
import type { Configuration as RspackConfiguration } from '@rspack/core';

type RspackConfigurationWrapper = any extends RspackConfiguration
  ? never
  : RspackConfiguration;

export interface WebpackConfigData {
  name: 'webpack' | 'rspack';
  version: string | number;
  bin?: string;
  config: Configuration | RspackConfigurationWrapper;
}

export type ConfigData = WebpackConfigData[];
