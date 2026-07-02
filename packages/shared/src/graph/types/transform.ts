import { SDK } from '@rsdoctor/shared/types';

export type ParseBundle = (
  assetFile: string,
  modules: Pick<SDK.ModuleInstance, 'renderId' | 'identifier'>[],
) => {
  modules?: Record<string, any>;
  src?: string;
  runtimeSrc?: string;
};
