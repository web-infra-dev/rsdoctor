import path from 'path';
import { RsdoctorPluginInstance } from '@/types';
import { ModuleGraph } from '@rsdoctor/graph';
import { Linter, Plugin, Constants, Manifest } from '@rsdoctor/types';
import { Process } from '@rsdoctor/utils/build';
import { debug } from '@rsdoctor/utils/logger';
import fse from 'fs-extra';
import {
  Chunks as ChunksBuildUtils,
  ModuleGraph as ModuleGraphBuildUtils,
} from '../../build-utils/build';
import { Chunks as ChunksUtils } from '../../build-utils/common';
import { internalPluginTapPreOptions } from '../constants';

/**
 * @description Generate ModuleGraph and ChunkGraph from stats and webpack module apis;
 * @param {Compiler} compiler
 * @return {*}
 * @memberof RsdoctorWebpackPlugin
 */
export const ensureModulesChunksGraphFn = (
  compiler: Plugin.BaseCompiler,
  _this: RsdoctorPluginInstance<Plugin.BaseCompiler, Linter.ExtendRuleData[]>,
) => {
  if (_this._modulesGraphApplied) return;
  _this._modulesGraphApplied = true;

  const context: Required<ModuleGraphBuildUtils.TransformContext> = {
    astCache: new Map(),
    packagePathMap: new Map(),
    getSourceMap: (file: string) => {
      return _this.sdk.getSourceMap(file);
    },
  };

  compiler.hooks.done.tapPromise(
    internalPluginTapPreOptions('moduleGraph'),
    async (_stats) => {
      const stats = _stats as Plugin.Stats;
      const statsJson = stats.toJson();

      debug(Process.getMemoryUsageMessage, '[Before Generate ModuleGraph]');

      _this.chunkGraph = ChunksBuildUtils.chunkTransform(new Map(), statsJson);

      /** generate module graph */
      _this.modulesGraph = await ModuleGraphBuildUtils.getModuleGraphByStats(
        stats.compilation,
        statsJson,
        process.cwd(),
        _this.chunkGraph,
        _this.options.features,
        context,
      );

      debug(Process.getMemoryUsageMessage, '[After Generate ModuleGraph]');

      /** Tree Shaking */
      if (_this.options.features.treeShaking) {
        _this.modulesGraph =
          ModuleGraphBuildUtils.appendTreeShaking(
            _this.modulesGraph,
            stats.compilation,
          ) || _this.modulesGraph;
        _this.sdk.addClientRoutes([
          Manifest.RsdoctorManifestClientRoutes.TreeShaking,
        ]);

        debug(
          Process.getMemoryUsageMessage,
          '[After AppendTreeShaking to ModuleGraph]',
        );
      }

      /** transform modules graph */
      const shouldParseBundle = _this.options.supports.parseBundle !== false;
      await getModulesInfosByStats(
        compiler,
        statsJson,
        _this.modulesGraph,
        shouldParseBundle,
      );

      debug(Process.getMemoryUsageMessage, '[After Transform ModuleGraph]');

      _this.modulesGraph &&
        (await _this.sdk.reportModuleGraph(_this.modulesGraph));
      await _this.sdk.reportChunkGraph(_this.chunkGraph);

      if (_this.options.supports.generateTileGraph) {
        /** Generate webpack-bundle-analyzer tile graph */
        const reportFilePath = await ChunksBuildUtils.generateTileGraph(
          statsJson as Plugin.BaseStats,
          {
            reportFilename: path.join(
              Constants.RsdoctorOutputFolder,
              ChunksBuildUtils.TileGraphReportName,
            ),
            reportTitle: 'bundle-analyzer',
          },
          compiler.outputPath,
        );

        reportFilePath &&
          (await _this.sdk.reportTileHtml(
            fse.readFileSync(reportFilePath, 'utf-8'),
          ));
      }
    },
  );
};

/**
 * @protected
 * @description This function to get module parsed code and size;
 * @param {Compiler} compiler
 * @param {StatsCompilation} stats
 * @param {ModuleGraph} moduleGraph
 * @return {*}
 * @memberof RsdoctorWebpackPlugin
 */
async function getModulesInfosByStats(
  compiler: Plugin.BaseCompiler,
  stats: Plugin.StatsCompilation,
  moduleGraph: ModuleGraph,
  parseBundle: boolean,
) {
  if (!moduleGraph) {
    return;
  }
  try {
    const parsedModulesData =
      (await ChunksBuildUtils.getAssetsModulesData(
        stats,
        compiler.outputPath,
        parseBundle,
      )) || {};
    ChunksUtils.transformAssetsModulesData(parsedModulesData, moduleGraph);
  } catch (e) {}
}
