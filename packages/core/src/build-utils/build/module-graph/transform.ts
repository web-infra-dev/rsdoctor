import { Plugin } from '@rsdoctor/types';
import { ModuleGraphTrans } from '@rsdoctor/graph';
import { TransformContext, appendModuleGraphByCompilation } from '.';
import { SDK } from '@rsdoctor/types';

export function getModuleGraphByStats(
  compilation: Plugin.BaseCompilation,
  stats: Plugin.StatsCompilation,
  root: string,
  chunkGraph: SDK.ChunkGraphInstance,
  features?: Plugin.RsdoctorWebpackPluginFeatures,
  context?: TransformContext,
) {
  return appendModuleGraphByCompilation(
    compilation,
    ModuleGraphTrans.getModuleGraphByStats(stats, root, chunkGraph),
    features,
    context,
  );
}
