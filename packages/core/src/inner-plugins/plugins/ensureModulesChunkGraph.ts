import path from 'path';
import {
  RsdoctorPluginInstance,
  RsdoctorRspackPluginOptionsNormalized,
} from '@/types';
import { Linter, Plugin, Constants, Manifest, SDK } from '@rsdoctor/types';
import { Process } from '@rsdoctor/utils/build';
import { chalk, debug, logger } from '@rsdoctor/utils/logger';
import fse from 'fs-extra';
import {
  Chunks as ChunksBuildUtils,
  ModuleGraph as ModuleGraphBuildUtils,
} from '@/build-utils/build';
import { Chunks as ChunksUtils } from '@rsdoctor/graph/transform-bundle';
import { internalPluginTapPreOptions } from '../constants';
import { applyRspackNativePlugin } from './rspack';

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

  const RsdoctorRspackPlugin = (
    compiler.webpack.experiments as Plugin.RspackExportsExperiments
  )?.RsdoctorPlugin;
  const enableRspackNativePlugin = (
    _this.options as RsdoctorRspackPluginOptionsNormalized<
      Linter.ExtendRuleData[]
    >
  ).experiments?.enableNativePlugin;
  if (enableRspackNativePlugin && RsdoctorRspackPlugin) {
    applyRspackNativePlugin(compiler, _this, RsdoctorRspackPlugin);
  }

  compiler.hooks.done.tapPromise(
    internalPluginTapPreOptions('moduleGraph'),
    async (_stats: any) => {
      const stats = _stats as Plugin.Stats;
      const getStatsJson = (() => {
        let cached: Plugin.StatsCompilation | null = null;
        return () => {
          if (cached) return cached as Plugin.StatsCompilation;
          // TODO: need optimize this stats.toJSON 's stats options.
          cached = stats.toJson();
          return cached;
        };
      })();
      debug(Process.getMemoryUsageMessage, '[Before Generate ModuleGraph]');

      if (!_this.chunkGraph?.getChunks().length) {
        _this.chunkGraph = ChunksBuildUtils.chunkTransform(
          new Map(),
          getStatsJson(),
        );
      }

      if (!_this.modulesGraph.getModules().length) {
        /** generate module graph */
        _this.modulesGraph = await ModuleGraphBuildUtils.getModuleGraphByStats(
          stats.compilation,
          getStatsJson(),
          process.cwd(),
          _this.chunkGraph!,
          _this.options.features,
          context,
        );
      }

      debug(Process.getMemoryUsageMessage, '[After Generate ModuleGraph]');

      /** Tree Shaking */
      if (_this.options.features.treeShaking) {
        if ('rspackVersion' in compiler.webpack) {
          logger.info(
            chalk.yellow(
              'Rspack currently does not support treeShaking capabilities.',
            ),
          );
          return;
        }

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
      await getModulesInfos(
        compiler,
        _this.modulesGraph,
        _this.chunkGraph!,
        shouldParseBundle,
      );

      debug(Process.getMemoryUsageMessage, '[After Transform ModuleGraph]');

      _this.modulesGraph &&
        (await _this.sdk.reportModuleGraph(_this.modulesGraph));
      await _this.sdk.reportChunkGraph(_this.chunkGraph!);

      if (_this.options.supports.generateTileGraph) {
        /** Generate webpack-bundle-analyzer tile graph */
        const reportFilePath = await ChunksBuildUtils.generateTileGraph(
          getStatsJson() as Plugin.BaseStats,
          {
            reportFilename: path.join(
              Constants.RsdoctorOutputFolder,
              ChunksBuildUtils.TileGraphReportName,
            ),
            reportTitle: 'bundle-analyzer',
            reportDir: _this.options.output.reportDir,
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
async function getModulesInfos(
  compiler: Plugin.BaseCompiler,
  moduleGraph: SDK.ModuleGraphInstance,
  chunkGraph: SDK.ChunkGraphInstance,
  parseBundle: boolean,
) {
  if (!moduleGraph) {
    return;
  }
  try {
    const parsedModulesData =
      (await ChunksBuildUtils.getAssetsModulesData(
        moduleGraph,
        chunkGraph,
        compiler.outputPath,
        parseBundle,
      )) || {};
    ChunksUtils.transformAssetsModulesData(parsedModulesData, moduleGraph);
  } catch (e) {}
}
