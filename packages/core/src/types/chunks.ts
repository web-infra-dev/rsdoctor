import { Plugin } from '@rsdoctor/shared/types';

export type AssetsModules = {
  label?: string;
  isAsset?: boolean;
  modules?: Plugin.StatsModule[];
};
