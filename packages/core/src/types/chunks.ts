import { Plugin } from '@rsdoctor/types';

export type AssetsModules = {
  label?: string;
  isAsset?: boolean;
  modules?: Plugin.StatsModule[];
};
