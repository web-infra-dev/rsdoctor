import { Plugin, SDK } from '@rsdoctor/types';
import { Chunks, ModuleGraph } from '..';

export async function transStats(json: Plugin.StatsCompilation) {
  const chunkGraph: SDK.ChunkGraphInstance = Chunks.chunkTransform(
    new Map(),
    json,
  );
  const moduleGraph = ModuleGraph.getModuleGraphByStats(json, '.', chunkGraph);
  const assetsModuleMap =
    (await Chunks.getAssetsModulesData(json, json.outputPath || '', {})) || {};
  Chunks.transformAssetsModulesData(assetsModuleMap, moduleGraph);
  return { chunkGraph, moduleGraph };
}
