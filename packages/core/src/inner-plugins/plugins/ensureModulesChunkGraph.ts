import {
  RsdoctorPluginInstance,
  RsdoctorRspackPluginOptionsNormalized,
} from '@/types';
import { Linter, Plugin, Manifest, SDK } from '@rsdoctor/types';
import { Process } from '@rsdoctor/utils/build';
import { chalk, debug, logger } from '@rsdoctor/utils/logger';
import {
  Chunks as ChunksBuildUtils,
  ModuleGraph as ModuleGraphBuildUtils,
} from '@/build-utils/build';
import {
  internalPluginTapPreOptions,
  pluginTapPostOptions,
} from '../constants';
import { applyRspackNativePlugin } from './rspack';
import { RawSourceMap, SourceMapConsumer } from 'source-map-js';
import fs from 'fs';
import path from 'path';

export interface MappingItem {
  source: string | null;
  generatedLine: number;
  generatedColumn: number;
  originalLine: number | null;
  originalColumn: number | null;
  name: string | null;
}

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
        } else {
          _this.modulesGraph =
            ModuleGraphBuildUtils.appendTreeShaking(
              _this.modulesGraph,
              stats.compilation,
            ) || _this.modulesGraph;
          _this.sdk.addClientRoutes([
            Manifest.RsdoctorManifestClientRoutes.TreeShaking,
          ]);
        }
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
        _this.sourceMapSets,
      );

      debug(Process.getMemoryUsageMessage, '[After Transform ModuleGraph]');

      _this.modulesGraph &&
        (await _this.sdk.reportModuleGraph(_this.modulesGraph));
      await _this.sdk.reportChunkGraph(_this.chunkGraph!);

      if (_this.options.supports.generateTileGraph) {
        logger.warn(
          chalk.yellow(
            'The option generateTileGraph is deprecated. Tile graph is now supported by default.',
          ),
        );
      }
    },
  );

  compiler.hooks.afterEmit.tapPromise(
    {
      ...pluginTapPostOptions,
      stage: pluginTapPostOptions.stage! + 100,
    },
    (compilation) => afterEmit(compilation, _this),
  );
};

const afterEmit = async (
  compilation: Plugin.BaseCompilation,
  _this: RsdoctorPluginInstance<Plugin.BaseCompiler, Linter.ExtendRuleData[]>,
): Promise<void> => {
  console.time('afterEmit:::::');

  const assets = compilation.getAssets();

  // Map<source, string>
  const sourceMapSets = new Map<string, string>();

  for (const asset of assets) {
    // 只处理 .js || .ts 文件，跳过非 .js 和 .ts 文件
    if (!asset.name.endsWith('.js') && !asset.name.endsWith('.ts')) continue;
    // 1. 读取 asset 文件内容
    // 优先用 info.sourceFilename，否则用输出目录+asset.name
    let assetPath = asset.info?.sourceFilename;
    if (!assetPath) {
      assetPath = path.join(compilation.outputOptions.path || '', asset.name);
    }
    if (!assetPath || !fs.existsSync(assetPath)) continue;
    const assetContent = fs.readFileSync(assetPath, 'utf-8');
    const assetLinesCodeList = assetContent.split(/\r?\n/);

    // 2. 解析 source map
    // TODO: sourceAndMap 返回的 map.sources 里，source 会被 Rsdoctor 的 probe loader 所修改。
    const { map } = asset.source.sourceAndMap();
    if (map) {
      const consumer = new SourceMapConsumer(map as unknown as RawSourceMap);

      // 1. 收集所有 mapping，按行分组
      const lineMappings = new Map<number, Array<MappingItem>>();
      consumer.eachMapping((m: MappingItem) => {
        if (!lineMappings.has(m.generatedLine)) {
          lineMappings.set(m.generatedLine, []);
        }
        lineMappings.get(m.generatedLine)!.push(m);
      });

      // 2. 对每一行的 mapping，按 generatedColumn 升序
      for (const [lineNum, mappings] of lineMappings.entries()) {
        mappings.sort((a, b) => a.generatedColumn - b.generatedColumn);
        const lineIdx = lineNum - 1;
        if (lineIdx < 0 || lineIdx >= assetLinesCodeList.length) continue;
        const line = assetLinesCodeList[lineIdx];

        for (let i = 0; i < mappings.length; i++) {
          const m = mappings[i];
          // 如果 source 是 null，则跳过
          if (!m.source) continue;
          const realSource = m.source.split('!').pop();

          if (!realSource) continue;

          const next = mappings[i + 1];
          const start = m.generatedColumn;
          const end = next ? next.generatedColumn : line.length;
          const codeSegment = line.slice(start, end);
          // 用 concat 拼接 codeSegment
          const prev = sourceMapSets.get(realSource) || '';
          sourceMapSets.set(realSource, prev.concat(codeSegment));
        }
      }
    }
  }
  _this.sourceMapSets = sourceMapSets;
  console.timeEnd('afterEmit:::::'); // TODO: 需要优化 换成 debug
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
  sourceMapSets: Map<string, string>,
) {
  if (!moduleGraph) {
    return;
  }
  try {
    await ChunksBuildUtils.getAssetsModulesData(
      moduleGraph,
      chunkGraph,
      compiler.outputPath,
      sourceMapSets,
      parseBundle,
    );
  } catch (e) {}
}
