import { Plugin } from '@rsdoctor/shared/types';
import { ModuleGraphTrans } from '@rsdoctor/core/graph';
import { SDK } from '@rsdoctor/shared/types';

export function getModuleGraphByStats(
  _compilation: Plugin.BaseCompilation,
  stats: Plugin.StatsCompilation,
  root: string,
  chunkGraph: SDK.ChunkGraphInstance,
  _features?: Plugin.RsdoctorRspackPluginFeatures,
) {
  return ModuleGraphTrans.getModuleGraphByStats(stats, root, chunkGraph);
}
