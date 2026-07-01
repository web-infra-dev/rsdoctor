import type { RsdoctorPluginInstance } from '../../types';
import { Linter, Plugin, SDK } from '@rsdoctor/shared/types';
import { Process } from '@rsdoctor/core/build-utils';
import { chalk, logger } from '@rsdoctor/core/logger';
import {
  Chunks as ChunksBuildUtils,
  ModuleGraph as ModuleGraphBuildUtils,
} from '@/build-utils/build';
import {
  internalPluginTapPreOptions,
  pluginTapPostOptions,
} from '../constants';
import { applyRspackNativePlugin } from './rspack';
import { handleAfterEmitAssets } from './sourcemapTool';

/**
 * Represents a mapping item from a source map.
 */
export interface MappingItem {
  source: string | null; // The original source file
  generatedLine: number; // The line number in the generated file
  generatedColumn: number; // The column number in the generated file
  originalLine: number | null; // The line number in the original source
  originalColumn: number | null; // The column number in the original source
  name: string | null; // The symbol name (if any)
}

let hasConsole = false;

/**
 * Main function to generate ModuleGraph and ChunkGraph from Rspack native data
 * or stats fallback, and collect source maps.
 */
export const ensureModulesChunksGraphFn = (
  compiler: Plugin.BaseCompiler,
  _this: RsdoctorPluginInstance<Plugin.BaseCompiler, Linter.ExtendRuleData[]>,
) => {
  // Prevent duplicate application
  if (_this._modulesGraphApplied) return;
  _this._modulesGraphApplied = true;

  // Check for Rspack native plugin support
  const RsdoctorRspackPlugin = (
    compiler.webpack.experiments as Plugin.RspackExportsExperiments
  )?.RsdoctorPlugin;

  if (RsdoctorRspackPlugin) {
    applyRspackNativePlugin(compiler, _this, RsdoctorRspackPlugin);
  }

  // Initialize real source path cache if not present
  if (!_this._realSourcePathCache) {
    _this._realSourcePathCache = new Map();
  }

  // Hook: After compilation is done, generate graphs and process stats
  compiler.hooks.done.tapPromise(
    internalPluginTapPreOptions('moduleGraph'),
    async (_stats: any) => {
      await doneHandler(_stats, _this, compiler);
    },
  );

  // Hook: Process assets to collect source maps (Rspack only)
  compiler.hooks.compilation.tap(
    {
      ...pluginTapPostOptions,
      name: 'RsdoctorSourceMapCollector',
    },
    (compilation: Plugin.BaseCompilation) => {
      if (compilation.hooks.processAssets) {
        compilation.hooks.processAssets.tapPromise(
          {
            name: 'RsdoctorSourceMapCollector',
            stage: 2500 - 100, // Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_HASH
          },
          async () => {
            if (!ensureDevtools(compiler)) {
              return;
            }
            const { namespace, sourceMapFilenameRegex } =
              calculateNamespaceAndRegex(compiler);
            await handleAfterEmitAssets(
              compilation,
              _this,
              sourceMapFilenameRegex,
              namespace,
            );
          },
        );
      }
    },
  );
};

/**
 * Handler function for the done hook. Generates graphs, processes stats, and reports results.
 */
async function doneHandler(
  _stats: any,
  _this: RsdoctorPluginInstance<Plugin.BaseCompiler, Linter.ExtendRuleData[]>,
  compiler: Plugin.BaseCompiler,
) {
  const stats = _stats as Plugin.Stats;
  // Lazy getter for stats JSON, with caching
  const getStatsJson = (() => {
    let cached: Plugin.StatsCompilation | null = null;
    return () => {
      if (cached) return cached as Plugin.StatsCompilation;
      cached = stats.toJson({
        all: false,
        chunks: true,
        modules: true,
        chunkModules: true,
        assets: true,
        ids: true,
        hash: true,
        errors: true,
        warnings: true,
        nestedModules: true,
        cachedModules: true,
        orphanModules: true,
        runtimeModules: true,
        optimizationBailout: true,
      });
      return cached;
    };
  })();
  logger.debug(
    `${(Process.getMemoryUsageMessage(), '[Before Generate ModuleGraph]')}`,
  );

  // Generate chunk graph if not already present
  if (!_this.chunkGraph?.getChunks().length) {
    _this.chunkGraph = ChunksBuildUtils.chunkTransform(
      new Map(),
      getStatsJson(),
    );
  }

  // Generate module graph if not already present
  if (!_this.modulesGraph.getModules().length) {
    /** generate module graph */
    _this.modulesGraph = await ModuleGraphBuildUtils.getModuleGraphByStats(
      stats.compilation,
      getStatsJson(),
      process.cwd(),
      _this.chunkGraph!,
      _this.options.features,
    );
  }

  logger.debug(
    `${(Process.getMemoryUsageMessage(), '[After Generate ModuleGraph]')}`,
  );

  /**
   * Transform modules graph: collect additional module info, such as parsed code and size.
   * Optionally parses bundle if enabled in options.
   */
  const shouldParseBundle = _this.options.supports.parseBundle !== false;
  await getModulesInfos(
    compiler,
    _this.modulesGraph,
    _this.chunkGraph!,
    shouldParseBundle,
    _this.sourceMapSets,
    _this.assetsWithoutSourceMap,
  );

  logger.debug(
    `${Process.getMemoryUsageMessage()}, '[After Transform ModuleGraph]'`,
  );

  // Report graphs to SDK for further processing or client display
  logger.debug('reportModuleGraph start');
  if (_this.modulesGraph) {
    await _this.sdk.reportModuleGraph(_this.modulesGraph);
  }
  logger.debug('reportModuleGraph done');
  logger.debug('reportChunkGraph start');
  await _this.sdk.reportChunkGraph(_this.chunkGraph!);
  logger.debug('reportChunkGraph done');
  // Warn if deprecated treemap option is enabled
  if (_this.options.supports.generateTileGraph) {
    logger.warn(
      chalk.yellow(
        'The option generateTileGraph is deprecated. Treemap (i.e. Tile Graph) is now supported by default.',
      ),
    );
  }
  logger.debug('doneHandler done');
}

/**
 * Checks if source map processing is enabled and supported by the current compiler configuration.
 * Warns if eval-based source maps are used (unsupported).
 * @param compiler - The Rspack compiler instance.
 * @returns true if source maps are enabled and supported, false otherwise.
 */
export const ensureDevtools = (compiler: Plugin.BaseCompiler) => {
  const devtool = compiler.options.devtool;

  if (typeof devtool === 'string' && /eval/i.test(devtool)) {
    if (!hasConsole) {
      logger.warn(
        'SourceMap with eval is not supported. Please use other sourcemap options.',
      );
    }
    hasConsole = true;
    return false;
  }

  return true;
};

/**
 * Collects parsed code and size information for all modules in the module graph.
 * Used to enrich the module graph with additional data for analysis and reporting.
 * @param compiler - The Rspack compiler instance.
 * @param moduleGraph - The module graph instance.
 * @param chunkGraph - The chunk graph instance.
 * @param parseBundle - Whether to parse the bundle for additional info.
 * @param sourceMapSets - Map of source file to code segments from source maps.
 */
async function getModulesInfos(
  compiler: Plugin.BaseCompiler,
  moduleGraph: SDK.ModuleGraphInstance,
  chunkGraph: SDK.ChunkGraphInstance,
  parseBundle: boolean,
  sourceMapSets: Map<string, string>,
  assetsWithoutSourceMap?: Set<string>,
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
      assetsWithoutSourceMap,
    );
  } catch {
    // Ignore errors
  }
}

/**
 * Escapes special characters in a string for use in a regular expression.
 * @param str - The string to escape.
 * @returns The escaped string.
 */
function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Calculates namespace and source map filename regex for source map resolution.
 * @param compiler - The Rspack compiler instance.
 * @returns An object containing namespace and sourceMapFilenameRegex.
 */
export function calculateNamespaceAndRegex(compiler: Plugin.BaseCompiler) {
  // Determine namespace for source map resolution
  let namespace =
    compiler.options.output.devtoolNamespace ||
    compiler.options.output.library?.name ||
    '[^/]+/';

  if (Array.isArray(namespace)) {
    namespace = namespace[0];
  } else if (typeof namespace === 'object' && 'name' in namespace) {
    namespace = (namespace as { name: string }).name;
  }

  // Build regex for extracting file paths from source map sources
  const safeNamespace = escapeRegExp(namespace as string);
  const sourceMapFilenameRegex = new RegExp(
    `(?:webpack://)?(?:${safeNamespace})?([^?]*)`,
  );

  return {
    namespace: namespace as string,
    sourceMapFilenameRegex,
  };
}
