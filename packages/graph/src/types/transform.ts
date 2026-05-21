import { SDK } from '@rsdoctor/types';

export type ParseBundle = (
  assetFile: string,
  modules: Pick<SDK.ModuleInstance, 'renderId' | 'webpackId'>[],
) => {
  modules?: Record<string, any>;
  src?: string;
  runtimeSrc?: string;
};
