import { Plugin, SDK } from '@rsdoctor/types';

export type AssetsModules = {
  label?: string;
  isAsset?: boolean;
  modules?: Plugin.StatsModule[];
};

export type ParseBundle = (
  assetFile: string,
  modules: Pick<SDK.ModuleInstance, 'renderId' | 'webpackId'>[],
) => {
  modules?: Record<string, any>;
  src?: string;
  runtimeSrc?: string;
};
