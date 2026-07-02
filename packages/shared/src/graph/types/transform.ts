import { SDK } from '../../types';

export type ParseBundle = (
  assetFile: string,
  modules: Pick<SDK.ModuleInstance, 'renderId' | 'identifier'>[],
) => {
  modules?: Record<string, any>;
  src?: string;
  runtimeSrc?: string;
};
