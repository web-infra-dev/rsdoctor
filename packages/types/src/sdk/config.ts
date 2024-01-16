import type { Configuration } from 'webpack';
import type { Configuration  as RspackConfiguration} from '@rspack/core';

export interface WebpackConfigData {
  name: 'webpack' | 'rspack';
  version: string | number;
  bin?: string;
  config: Configuration | RspackConfiguration;
}

export type ConfigData = WebpackConfigData[];
