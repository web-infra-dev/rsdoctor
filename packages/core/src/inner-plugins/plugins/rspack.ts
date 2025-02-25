import { ChunkGraph } from '@rsdoctor/graph';
import type {
  Compilation as RspackCompilation,
  RsdoctorPluginHooks,
} from '@rspack/core';
import { Linter, Plugin } from '@rsdoctor/types';
import type { experiments } from '@rspack/core';
import { RsdoctorPluginInstance } from '@/types';
import {
  Chunks as ChunksBuildUtils,
  ModuleGraph as ModuleGraphBuildUtils,
} from '@/build-utils/build';
import { internalPluginTapPreOptions } from '../constants';
import { logger } from '@rsdoctor/utils/logger';

export function applyRspackNativePlugin(
  compiler: Plugin.BaseCompiler,
  plugin: RsdoctorPluginInstance<Plugin.BaseCompiler, Linter.ExtendRuleData[]>,
  RsdoctorRspackPlugin: typeof experiments.RsdoctorPlugin,
) {
  logger.debug('[RspackNativePlugin] Apply hooks');
  compiler.hooks.compilation.tap('RsdoctorRspackPlugin', (compilation) => {
    const hooks = RsdoctorRspackPlugin.getCompilationHooks(
      compilation as RspackCompilation,
    ) as RsdoctorPluginHooks;
    // use cache to avoid unexpected timing of hooks
    const cached: {
      chunkGraphData?: Plugin.RspackNativeChunkGraph | true;
      moduleGraphData?: Plugin.RspackNativeModuleGraph | true;
      moduleIdsPatchData?: Plugin.RspackNativeModuleIdsPatch | true;
      assetPatchData?: Plugin.RspackNativeAssetPatch | true;
      moduleSourcesPatchData?: Plugin.RspackNativeModuleSourcePatch | true;
    } = {};
    type CachedData<
      K extends keyof typeof cached,
      T = (typeof cached)[K],
    > = T extends true | undefined ? never : T;
    const dependOn: Record<keyof typeof cached, (keyof typeof cached)[]> = {
      chunkGraphData: [],
      moduleGraphData: ['chunkGraphData'],
      assetPatchData: ['chunkGraphData'],
      moduleIdsPatchData: ['moduleGraphData'],
      moduleSourcesPatchData: ['moduleGraphData'],
    };
    const consumer: {
      chunkGraphData: <K extends 'chunkGraphData'>(data: CachedData<K>) => void;
      moduleGraphData: <K extends 'moduleGraphData'>(
        data: CachedData<K>,
      ) => void;
      moduleIdsPatchData: <K extends 'moduleIdsPatchData'>(
        data: CachedData<K>,
      ) => void;
      moduleSourcesPatchData: <K extends 'moduleSourcesPatchData'>(
        data: CachedData<K>,
      ) => void;
      assetPatchData: <K extends 'assetPatchData'>(data: CachedData<K>) => void;
    } = {
      chunkGraphData: (data: Plugin.RspackNativeChunkGraph) => {
        plugin.chunkGraph = new ChunkGraph();
        ChunksBuildUtils.patchNativeChunkGraph(plugin.chunkGraph, data);
      },
      moduleGraphData: (data: Plugin.RspackNativeModuleGraph) => {
        ModuleGraphBuildUtils.patchNativeModuleGraph(
          plugin.modulesGraph,
          plugin.chunkGraph!,
          data,
        );
      },
      moduleIdsPatchData: (data: Plugin.RspackNativeModuleIdsPatch) => {
        ModuleGraphBuildUtils.patchNativeModuleIds(plugin.modulesGraph, data);
      },
      moduleSourcesPatchData: (data: Plugin.RspackNativeModuleSourcePatch) => {
        ModuleGraphBuildUtils.patchNativeModuleSources(
          plugin.modulesGraph,
          data,
        );
      },
      assetPatchData: (data: Plugin.RspackNativeAssetPatch) => {
        ChunksBuildUtils.patchNativeAssets(plugin.chunkGraph!, data);
      },
    };
    const tryConsumeData = <K extends keyof typeof cached>(
      key: K,
      data: CachedData<K>,
    ) => {
      if (cached[key] === true) return;
      cached[key] = data;
      while (true) {
        let hasConsumed = false;
        for (const [_task, deps] of Object.entries(dependOn)) {
          const task = _task as keyof typeof cached;
          if (cached[task] === true || cached[task] === undefined) {
            continue;
          }
          const prepared = deps.every(
            (dep) => cached[dep as keyof typeof cached] === true,
          );
          if (!prepared) continue;
          (consumer[task] as (data: CachedData<typeof task>) => void)(
            cached[task] as CachedData<typeof task>,
          );
          cached[task] = true;
          hasConsumed = true;
        }
        if (!hasConsumed) break;
      }
    };
    hooks.chunkGraph.tap(
      internalPluginTapPreOptions('nativeChunkGraph'),
      (rawChunkGraph) => {
        logger.debug('[RspackNativePlugin] Called chunkGraph hook');
        tryConsumeData('chunkGraphData', rawChunkGraph);
      },
    );

    hooks.moduleGraph.tap(
      internalPluginTapPreOptions('nativeModuleGraph'),
      (rawModuleGraph) => {
        logger.debug('[RspackNativePlugin] Called moduleGraph hook');
        tryConsumeData('moduleGraphData', rawModuleGraph);
      },
    );

    hooks.moduleIds.tap(
      internalPluginTapPreOptions('nativeSourcePatch'),
      (rawModuleIdsPatch) => {
        logger.debug('[RspackNativePlugin] Called moduleIds hook');
        tryConsumeData('moduleIdsPatchData', rawModuleIdsPatch);
      },
    );

    hooks.moduleSources.tap(
      internalPluginTapPreOptions('nativeModuleSourcesPatch'),
      (rawModuleSourcesPatch) => {
        logger.debug('[RspackNativePlugin] Called moduleSources hook');
        tryConsumeData('moduleSourcesPatchData', rawModuleSourcesPatch);
      },
    );

    hooks.assets.tap(
      internalPluginTapPreOptions('nativeAssetPatch'),
      (rawAssetPatch) => {
        logger.debug('[RspackNativePlugin] Called assets hook');
        tryConsumeData('assetPatchData', rawAssetPatch);
      },
    );
  });
}
