import { Plugin } from '@rsdoctor/types';
import { getModuleGraphByStats as transform } from '@/build-utils/common/module-graph';
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
    transform(stats, root, chunkGraph),
    features,
    context,
  );
}
