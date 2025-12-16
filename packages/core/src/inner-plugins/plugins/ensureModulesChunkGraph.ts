import { RsdoctorPluginInstance } from '@/types';
import { Linter, Plugin, Manifest, SDK } from '@rsdoctor/types';
import { Process } from '@rsdoctor/utils/build';
import { chalk, logger } from '@rsdoctor/utils/logger';
import {
  Chunks as ChunksBuildUtils,
  ModuleGraph as ModuleGraphBuildUtils,
} from '@/build-utils/build';
import {
  internalPluginTapPreOptions,
  pluginTapPostOptions,
} from '../constants';
import { applyRspackNativePlugin } from './rspack';
import { handleEmitAssets, handleAfterEmitAssets } from './sourcemapTool';
import type { TransformContext } from '@/build-utils/build/module-graph/webpack/transform';

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
 * Main function to generate ModuleGraph and ChunkGraph from stats and Webpack module APIs.
 * Sets up hooks to process stats, generate graphs, handle tree shaking, and collect source maps.
 * @param compiler - The Webpack or Rspack compiler instance.
 * @param _this - The Rsdoctor plugin instance.
 */
export const ensureModulesChunksGraphFn = (
  compiler: Plugin.BaseCompiler,
  _this: RsdoctorPluginInstance<Plugin.BaseCompiler, Linter.ExtendRuleData[]>,
) => {
  // Prevent duplicate application
  if (_this._modulesGraphApplied) return;
  _this._modulesGraphApplied = true;

  // Context for module graph transformation
  const context: Required<ModuleGraphBuildUtils.TransformContext> = {
    astCache: new Map(),
    packagePathMap: new Map(),
    getSourceMap: (file: string) => {
      return _this.sdk.getSourceMap(file);
    },
  };

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
      await doneHandler(_stats, _this, context, compiler);
    },
  );

  // Hook: After assets are emitted, collect source maps (Rspack only)
  compiler.hooks.afterEmit.tapPromise(
    {
      ...pluginTapPostOptions,
      stage: pluginTapPostOptions.stage! + 100,
    },
    async (compilation) => {
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

  // Hook: During emit, collect source maps (Webpack only)
  compiler.hooks.emit.tapAsync(
    {
      ...pluginTapPostOptions,
      stage: pluginTapPostOptions.stage! + 100,
    },
    // webpack only, webpack use emitHandler to collect source maps
    emitHandler.bind(null, _this, compiler),
  );
};

/**
 * Handler function for the done hook. Generates graphs, processes stats, handles tree shaking, and reports results.
 * @param _stats - The stats object from the compiler.
 * @param _this - The Rsdoctor plugin instance.
 * @param context - The module graph transformation context.
 * @param compiler - The Webpack or Rspack compiler instance.
 */
async function doneHandler(
  _stats: any,
  _this: RsdoctorPluginInstance<Plugin.BaseCompiler, Linter.ExtendRuleData[]>,
  context: Required<TransformContext>,
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
      context,
    );
  }

  logger.debug(
    `${(Process.getMemoryUsageMessage(), '[After Generate ModuleGraph]')}`,
  );

  /**
   * Tree Shaking: If enabled, attempt to append tree shaking info to the module graph.
   * Note: Rspack currently does not support tree shaking.
   */
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
    logger.debug(
      `${
        (Process.getMemoryUsageMessage(),
        '[After AppendTreeShaking to ModuleGraph]')
      }`,
    );
  }

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
  _this.modulesGraph && (await _this.sdk.reportModuleGraph(_this.modulesGraph));
  await _this.sdk.reportChunkGraph(_this.chunkGraph!);

  // Warn if deprecated treemap option is enabled
  if (_this.options.supports.generateTileGraph) {
    logger.warn(
      chalk.yellow(
        'The option generateTileGraph is deprecated. Treemap (i.e. Tile Graph) is now supported by default.',
      ),
    );
  }
}

/**
 * Checks if source map processing is enabled and supported by the current compiler configuration.
 * Warns if eval-based source maps are used (unsupported).
 * @param compiler - The Webpack or Rspack compiler instance.
 * @returns true if source maps are enabled and supported, false otherwise.
 */
export const ensureDevtools = (compiler: Plugin.BaseCompiler) => {
  const devtool = compiler.options.devtool;

  if (typeof devtool === 'string' && /eval/i.test(devtool)) {
    !hasConsole &&
      logger.warn(
        'SourceMap with eval is not supported. Please use other sourcemap options.',
      );
    hasConsole = true;
    return false;
  }

  // rspack no need open the sourcemap options
  if ('rspack' in compiler) {
    return true;
  }

  const sourceMapEnabled =
    typeof devtool === 'string' && /source-?map/i.test(devtool);

  if (!sourceMapEnabled) {
    logger.debug('SourceMap is not enabled. Skipping sourcemap processing.');
    return false;
  }

  return true;
};

/**
 * Collects parsed code and size information for all modules in the module graph.
 * Used to enrich the module graph with additional data for analysis and reporting.
 * @param compiler - The Webpack or Rspack compiler instance.
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
  } catch (e) {}
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
 * @param compiler - The Webpack or Rspack compiler instance.
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

/**
 * Handler function for the emit hook. Collects source maps for Webpack assets.
 * @param _this - The Rsdoctor plugin instance.
 * @param compiler - The Webpack compiler instance.
 * @param compilation - The current compilation object.
 * @param callback - The callback to signal completion.
 */
async function emitHandler(
  _this: RsdoctorPluginInstance<Plugin.BaseCompiler, Linter.ExtendRuleData[]>,
  compiler: Plugin.BaseCompiler,
  compilation: Plugin.BaseCompilation,
  callback: () => void,
) {
  if (!ensureDevtools(compiler)) {
    callback();
    return;
  }

  const { namespace, sourceMapFilenameRegex } =
    calculateNamespaceAndRegex(compiler);

  await handleEmitAssets({
    compilation,
    pluginInstance: _this,
    sourceMapFilenameRegex,
    namespace,
  });
  callback();
}
