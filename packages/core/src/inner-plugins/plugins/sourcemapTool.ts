import { RsdoctorPluginInstance } from '@/types';
import { Linter, Plugin } from '@rsdoctor/types';
import { Graph } from '@rsdoctor/utils/common';
import { logger, time, timeEnd } from '@rsdoctor/utils/logger';
import { Asset } from '@rspack/core';
import { resolve } from 'path';
import { SourceMapConsumer, RawSourceMap, MappingItem } from 'source-map';

// Constant used to represent unresolved source paths
export const UNASSIGNED = '[unassigned]';

/**
 * Options for handling source map assets.
 * @property compilation - The current compilation object.
 * @property pluginInstance - The Rsdoctor plugin instance.
 * @property sourceMapFilenameRegex - Regex to extract file paths from source map sources.
 * @property namespace - Optional namespace for resolving sources.
 */
interface SourceMapAssetOptions {
  compilation: Plugin.BaseCompilation;
  pluginInstance: RsdoctorPluginInstance<
    Plugin.BaseCompiler,
    Linter.ExtendRuleData<any, string>[]
  >;
  sourceMapFilenameRegex: RegExp;
  namespace?: string;
}

/**
 * Returns a function that resolves a source path to an absolute path, with caching for performance.
 * Handles both normal and webpack:// sources, optionally using a namespace.
 * @param context - The base directory for resolution.
 * @param namespace - Optional namespace for webpack sources.
 * @param cache - Optional cache map to store resolved paths.
 */
export function bindContextCache(
  context: string,
  namespace?: string,
  cache?: Map<string, string>,
) {
  cache = cache || new Map<string, string>();
  return (source: string, sourceMapFilenameRegex: RegExp): string => {
    if (cache.has(source)) {
      return cache.get(source)!;
    }
    let resolved = UNASSIGNED;

    if (source.startsWith('file://')) {
      resolved = resolve(context, source.replace(/^file:\/\//, ''));
    } else if (!source.startsWith('webpack://')) {
      resolved = resolve(context, source);
    } else {
      // For webpack:// sources, extract file path and resolve
      const match = source.match(sourceMapFilenameRegex);
      const filePath = match?.[1];
      const hasNamespace =
        (namespace && source.startsWith(`webpack://${namespace}`)) ||
        (namespace && source.startsWith(`file://${namespace}`));
      const baseDir = hasNamespace ? process.cwd() : context;
      resolved = filePath ? resolve(baseDir, `./${filePath}`) : UNASSIGNED;
    }
    cache.set(source, resolved);
    return resolved;
  };
}

/**
 * Collects and processes source map information for a given asset.
 * Groups mappings by line, sorts them, and reconstructs the original source code segments.
 * @param map - The raw source map object.
 * @param assetLinesCodeList - The code lines of the asset.
 * @param _compilation - The current compilation object.
 * @param _this - The Rsdoctor plugin instance.
 * @param sourceMapFilenameRegex - Regex to extract file paths from source map sources.
 * @param namespace - Optional namespace for resolving sources.
 */
export async function collectSourceMaps(
  map: any,
  assetLinesCodeList: string[],
  _compilation: Plugin.BaseCompilation,
  _this: RsdoctorPluginInstance<Plugin.BaseCompiler, Linter.ExtendRuleData[]>,
  sourceMapFilenameRegex?: RegExp,
  namespace?: string,
) {
  if (map) {
    // Create a SourceMapConsumer to iterate mappings
    const consumer = await new SourceMapConsumer(
      map as unknown as RawSourceMap,
    );
    // Function to resolve real source file paths
    const getRealSourcePath = bindContextCache(
      _this.sdk._root || process.cwd(),
      namespace,
      _this._realSourcePathCache,
    );

    // Group all mappings by generated line number
    const lineMappings = new Map<number, Array<MappingItem>>();
    consumer.eachMapping((m: MappingItem) => {
      if (!lineMappings.has(m.generatedLine)) {
        lineMappings.set(m.generatedLine, []);
      }
      lineMappings.get(m.generatedLine)!.push(m);
    });

    // For each line, sort mappings by generatedColumn and reconstruct code segments
    for (const [lineNum, mappings] of lineMappings.entries()) {
      mappings.sort((a, b) => a.generatedColumn - b.generatedColumn);
      const lineIdx = lineNum - 1;
      if (lineIdx < 0 || lineIdx >= assetLinesCodeList.length) continue;
      const line = assetLinesCodeList[lineIdx];

      for (let i = 0; i < mappings.length; i++) {
        const m = mappings[i];
        // Skip if source is null
        if (!m.source) continue;

        // The source in map.sources returned by sourceAndMap may be modified by Rsdoctor's loader
        let realSource = m.source.split('!').pop();
        if (
          (realSource?.startsWith('webpack://') ||
            realSource?.startsWith('file://')) &&
          sourceMapFilenameRegex
        ) {
          realSource = getRealSourcePath(realSource, sourceMapFilenameRegex);
        }

        if (!realSource) continue;

        const next = mappings[i + 1];
        const start = m.generatedColumn;
        const end = next ? next.generatedColumn : line.length;
        const codeSegment = line.slice(start, end);
        // Concatenate code segments for each real source
        const prev = _this.sourceMapSets.get(realSource) || '';
        _this.sourceMapSets.set(realSource, prev.concat(codeSegment));
      }
    }
  }
}

/**
 * Handles source map collection after assets are emitted (Rspack only).
 * Iterates over all assets, parses them, and collects source maps.
 * @param compilation - The current compilation object.
 * @param _this - The Rsdoctor plugin instance.
 * @param sourceMapFilenameRegex - Regex to extract file paths from source map sources.
 */
export async function handleAfterEmitAssets(
  compilation: Plugin.BaseCompilation,
  _this: RsdoctorPluginInstance<
    Plugin.BaseCompiler,
    Linter.ExtendRuleData<any, string>[]
  >,
  sourceMapFilenameRegex?: RegExp,
  namespace?: string,
) {
  if ('rspack' in compilation.compiler) {
    _this.sourceMapSets = new Map();
    time('ensureModulesChunkGraph.afterEmit.start');
    const assets = [...compilation.getAssets()] as Asset[];
    for (const asset of assets) {
      const { assetLinesCodeList, map: mapFromAsset } = parseAsset(
        asset,
        assets,
        'js/css',
      );
      let map = mapFromAsset;
      if (!map) {
        let sourceMapFile = asset.info.related?.sourceMap;
        let sourceMapFileAssetName = sourceMapFile?.replace(
          /(\.[^.]+)(\.[^.]+)?$/,
          '$1',
        );
        if (sourceMapFile) {
          // Try to find the source map asset by exact name first
          let sourceMapAsset = assets.find(
            (asset) => asset.name === sourceMapFile,
          );

          // If not found by exact name, try to match by base name without hash
          if (!sourceMapAsset && sourceMapFileAssetName) {
            const baseNameWithoutHash = Graph.formatAssetName(
              sourceMapFileAssetName ?? '',
              typeof compilation.options.output.filename === 'string'
                ? compilation.options.output.filename
                : undefined,
            );
            sourceMapAsset = assets.find((asset) => {
              const assetBaseName = Graph.formatAssetName(
                asset.name,
                typeof compilation.options.output.filename === 'string'
                  ? compilation.options.output.filename
                  : undefined,
              );
              return (
                assetBaseName.includes(baseNameWithoutHash) &&
                asset.name.endsWith('.map')
              );
            });
          }

          if (sourceMapAsset) {
            map = JSON.parse(sourceMapAsset.source.source().toString());
          }
        } else {
          continue;
        }
      }
      try {
        await collectSourceMaps(
          map,
          assetLinesCodeList,
          compilation,
          _this,
          sourceMapFilenameRegex,
          namespace,
        );
      } catch (e) {
        logger.debug(e);
      }
    }
    timeEnd('ensureModulesChunkGraph.afterEmit.start');
  }
}

/**
 * Handles source map collection for Webpack assets (non-Rspack).
 * Iterates over all assets, parses them, and collects source maps.
 * @param options - SourceMapAssetOptions containing compilation, plugin instance, regex, and namespace.
 */
export async function handleEmitAssets(options: SourceMapAssetOptions) {
  const { compilation, pluginInstance, sourceMapFilenameRegex, namespace } =
    options;
  if (!('rspack' in compilation.compiler)) {
    pluginInstance.sourceMapSets = new Map();
    time('ensureModulesChunkGraph.afterEmit.start');
    const assets = Object.values(compilation.getAssets()).map(
      (asset, index) => ({
        name: index.toString(),
        source: asset,
        info: asset.info || {},
      }),
    );
    for (const asset of assets) {
      const { assetLinesCodeList, map } = parseAsset(asset, assets, 'map');
      if (!map) continue;
      try {
        await collectSourceMaps(
          map,
          assetLinesCodeList,
          compilation,
          pluginInstance,
          sourceMapFilenameRegex,
          namespace,
        );
      } catch (e) {
        logger.debug(e);
      }
    }
    timeEnd('ensureModulesChunkGraph.afterEmit.start');
  }
}

/**
 * Parses an asset to extract its content, code lines, and source map.
 * Handles both JS/CSS and .map files.
 * @param asset - The asset to parse.
 * @param assets - All assets in the compilation.
 * @param type - The type of asset ('js/css' or 'map').
 * @returns An object containing assetName, assetContent, assetLinesCodeList, and map.
 */
function parseAsset(
  asset: { name: any; source: any; info?: any },
  assets: any[],
  type: 'js/css' | 'map',
) {
  const assetName = asset.source?.name || asset.name;
  let assetContent = '';
  let assetLinesCodeList: string[] = [];
  let map: any = null;

  try {
    if (
      type === 'map' &&
      assetName.endsWith('.map') &&
      !asset.name.includes('d.ts')
    ) {
      // Add defensive checks for the source chain
      assetContent = asset.source?.source?.source?.() || '';
      if (!assetContent) {
        logger.debug(`Failed to get source content for asset: ${assetName}`);
        return {
          assetName,
          assetContent: '',
          assetLinesCodeList: [],
          map: null,
        };
      }

      map = JSON.parse(assetContent);
      const bundledAsset = assets.find(
        (asset2) => asset2.source?.name === map.file,
      );
      const bundledCode = bundledAsset?.source?.source?.source?.() || '';
      if (!bundledCode) {
        logger.debug(`Failed to get bundled code for asset: ${map.file}`);
        return { assetName, assetContent, assetLinesCodeList: [], map };
      }
      assetLinesCodeList = bundledCode.split(/\r?\n/);
    } else if (
      type === 'js/css' &&
      (assetName.endsWith('.js') || assetName.endsWith('.css'))
    ) {
      assetContent = asset.source?.source?.() || '';
      assetLinesCodeList = assetContent.split(/\r?\n/);
      map = asset.source?.sourceAndMap?.()?.map || null;
    }
  } catch (error) {
    logger.debug(`Error parsing asset ${assetName}:`, error);
    return { assetName, assetContent: '', assetLinesCodeList: [], map: null };
  }

  return { assetName, assetContent, assetLinesCodeList, map };
}
