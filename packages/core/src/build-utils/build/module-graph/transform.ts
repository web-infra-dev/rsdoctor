import { Plugin } from '@rsdoctor/types';
import { ModuleGraphTrans } from '@rsdoctor/graph';
import { SDK } from '@rsdoctor/types';

export function getModuleGraphByStats(
  _compilation: Plugin.BaseCompilation,
  stats: Plugin.StatsCompilation,
  root: string,
  chunkGraph: SDK.ChunkGraphInstance,
  _features?: Plugin.RsdoctorRspackPluginFeatures,
) {
  return ModuleGraphTrans.getModuleGraphByStats(stats, root, chunkGraph);
}
