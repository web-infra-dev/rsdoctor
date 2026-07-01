import { Plugin, SDK } from '@rsdoctor/types';
import { Chunks, ModuleGraphTrans } from '..';

/**
 * @description Convert stats to chunkGraph and moduleGraph, online tools for rsdoctor's website.
 * @param json
 * @returns
 */
export async function transStats(json: Plugin.StatsCompilation) {
  const chunkGraph: SDK.ChunkGraphInstance = Chunks.chunkTransform(
    new Map(),
    json,
  );
  const moduleGraph = ModuleGraphTrans.getModuleGraphByStats(
    json,
    '.',
    chunkGraph,
  );
  await Chunks.getAssetsModulesData(
    moduleGraph,
    chunkGraph,
    json.outputPath || '',
    {},
  );
  return { chunkGraph, moduleGraph };
}
