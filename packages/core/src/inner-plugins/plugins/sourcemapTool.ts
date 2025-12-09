import { RsdoctorPluginInstance } from '@/types';
import { Linter, Plugin } from '@rsdoctor/types';
import { Graph } from '@rsdoctor/utils/common';
import { logger, time, timeEnd } from '@rsdoctor/utils/logger';
import { Asset } from '@rspack/core';
import { resolve, dirname, isAbsolute } from 'path';
import { SourceMapConsumer, RawSourceMap, MappingItem } from 'source-map';

// Constant used to represent unresolved source paths
export const UNASSIGNED = '[unassigned]';

/**
 * Options for handling source map assets.
 * @param compilation - The current compilation object.
 * @param pluginInstance - The Rsdoctor plugin instance.
 * @param sourceMapFilenameRegex - Regex to extract file paths from source map sources.
 * @param namespace - Optional namespace for resolving sources.
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
 * Binds a context cache to a source path resolver.
 * @param context - The base context directory.
 * @param namespace - Optional namespace for resolving sources.
 * @param cache - The cache map to store resolved paths.
 * @param sourceMapDir - The directory containing source maps.
 * @param sourceRoot - The source root directory.
 * @returns A function that resolves source paths based on the given context.
 */
export function bindContextCache(
  context: string,
  namespace?: string,
  cache?: Map<string, string>,
  sourceMapDir?: string,
  sourceRoot?: string,
) {
  cache = cache || new Map<string, string>();
  return (source: string, sourceMapFilenameRegex?: RegExp): string => {
    if (cache.has(source)) {
      return cache.get(source)!;
    }
    let resolved = UNASSIGNED;

    if (source.startsWith('file://')) {
      resolved = resolve(context, source.replace(/^file:\/\//, ''));
    } else if (source.startsWith('webpack://')) {
      if (sourceMapFilenameRegex) {
        const match = source.match(sourceMapFilenameRegex);
        const filePath = match?.[1];
        const hasNamespace =
          (namespace && source.startsWith(`webpack://${namespace}`)) ||
          (namespace && source.startsWith(`file://${namespace}`));
        const baseDir = hasNamespace ? process.cwd() : context;
        resolved = filePath ? resolve(baseDir, `./${filePath}`) : UNASSIGNED;
      } else {
        resolved = UNASSIGNED;
      }
    } else {
      if (isAbsolute(source)) {
        resolved = source;
      } else {
        let baseDir = context;
        if (sourceRoot) {
          if (isAbsolute(sourceRoot)) {
            baseDir = sourceRoot;
          } else if (sourceMapDir) {
            baseDir = resolve(sourceMapDir, sourceRoot);
          } else {
            baseDir = resolve(context, sourceRoot);
          }
        } else if (sourceMapDir) {
          baseDir = sourceMapDir;
        }

        resolved = resolve(baseDir, source);
      }
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
  skipSources?: Set<string>,
  sourceMapPath?: string,
) {
  if (map) {
    const consumer = await new SourceMapConsumer(
      map as unknown as RawSourceMap,
    );
    let sourceMapDir: string | undefined;
    if (sourceMapPath) {
      sourceMapDir = dirname(sourceMapPath);
    } else if (_compilation.options.output?.path) {
      sourceMapDir =
        typeof _compilation.options.output.path === 'string'
          ? _compilation.options.output.path
          : undefined;
    }
    const sourceRoot = (map as RawSourceMap).sourceRoot;
    const getRealSourcePath = bindContextCache(
      _this.sdk.root || process.cwd(),
      namespace,
      _this._realSourcePathCache,
      sourceMapDir,
      sourceRoot ?? undefined,
    );

    // Group all mappings by generated line number
    const lineMappings = new Map<number, Array<MappingItem>>();
    // @ts-ignore consumer._absoluteSources maybe has problem.
    consumer._absoluteSources = consumer._sources;

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
        if (!m.source) continue;

        // The source in map.sources returned by sourceAndMap may be modified by Rsdoctor's loader
        // Handle loader chain paths (e.g., "loader1!loader2!/path/to/file.js")
        // Extract the actual source file path by splitting on '!' and taking the last part
        let realSource = m.source;

        if (realSource.includes('!')) {
          const parts = realSource.split('!');
          for (let j = parts.length - 1; j >= 0; j--) {
            const part = parts[j];
            if (!part) continue;

            const cleanPart = part.split('??')[0];

            if (cleanPart.startsWith('builtin:')) {
              continue;
            }
            // Check if it looks like a file path (absolute path starting with '/' or relative path)
            if (cleanPart.startsWith('/') || cleanPart.includes('\\')) {
              realSource = cleanPart;
              break;
            }
          }

          if (realSource === m.source) {
            const lastPart = parts[parts.length - 1];
            realSource = lastPart ? lastPart.split('??')[0] : lastPart;
          }
        } else if (realSource.includes('??')) {
          realSource = realSource.split('??')[0];
        }
        if (realSource) {
          if (
            (realSource.startsWith('webpack://') ||
              realSource.startsWith('file://')) &&
            sourceMapFilenameRegex
          ) {
            realSource = getRealSourcePath(realSource, sourceMapFilenameRegex);
          } else if (!isAbsolute(realSource)) {
            realSource = getRealSourcePath(realSource, sourceMapFilenameRegex);
          }
        }

        if (!realSource || realSource === UNASSIGNED) continue;
        // Skip if this source has already been processed in a previous asset
        if (skipSources && skipSources.has(realSource)) {
          continue;
        }

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
 * Handles the afterEmit event for assets to collect source map information.
 * @param compilation - The current compilation object.
 * @param _this - The Rsdoctor plugin instance.
 * @param sourceMapFilenameRegex - Regex to extract file paths from source map sources.
 * @param namespace - Optional namespace for resolving sources.
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
    const skipSources = new Set<string>();

    for (const asset of assets) {
      const {
        assetLinesCodeList,
        map: mapFromAsset,
        assetName,
      } = parseAsset(asset, assets, 'js/css');
      let map = mapFromAsset;
      let sourceMapPath: string | undefined;

      if (!map) {
        let sourceMapFile = asset.info.related?.sourceMap;
        let sourceMapFileAssetName = sourceMapFile?.replace(
          /(\.[^.]+)(\.[^.]+)?$/,
          '$1',
        );
        if (sourceMapFile) {
          let sourceMapAsset = assets.find(
            (asset) => asset.name === sourceMapFile,
          );
          if (!sourceMapAsset && sourceMapFileAssetName) {
            const baseNameWithoutHash = Graph.formatAssetName(
              sourceMapFileAssetName,
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
            const outputPath = compilation.options.output?.path;
            if (outputPath && typeof outputPath === 'string') {
              sourceMapPath = resolve(outputPath, sourceMapAsset.name);
            }
          }
        } else {
          continue;
        }
      } else {
        const outputPath = compilation.options.output?.path;
        if (outputPath && typeof outputPath === 'string' && assetName) {
          const mapFileName = assetName.endsWith('.map')
            ? assetName
            : `${assetName}.map`;
          sourceMapPath = resolve(outputPath, mapFileName);
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
          skipSources,
          sourceMapPath,
        );
      } catch (e) {
        logger.debug(e);
      }
      _this.sourceMapSets.forEach((_value: string, key: string) => {
        if (!skipSources.has(key)) {
          skipSources.add(key);
        }
      });
    }
    timeEnd('ensureModulesChunkGraph.afterEmit.start');
  }
}

/**
 * Handles the emit event for assets to collect source map information.
 * @param options - The options for handling source map assets.
 * @returns A promise that resolves when the source map information is collected.
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
      const { assetLinesCodeList, map, assetName } = parseAsset(
        asset,
        assets,
        'map',
      );
      if (!map) continue;
      let sourceMapPath: string | undefined;
      const outputPath = compilation.options.output?.path;
      if (
        outputPath &&
        typeof outputPath === 'string' &&
        typeof assetName === 'string'
      ) {
        const mapFileName = assetName.endsWith('.map')
          ? assetName
          : `${assetName}.map`;
        sourceMapPath = resolve(outputPath, mapFileName);
      }

      try {
        await collectSourceMaps(
          map,
          assetLinesCodeList,
          compilation,
          pluginInstance,
          sourceMapFilenameRegex,
          namespace,
          undefined,
          sourceMapPath,
        );
      } catch (e) {
        logger.debug(e);
      }
    }
    timeEnd('ensureModulesChunkGraph.afterEmit.start');
  }
}

/**
 * Parses an asset to extract its content and source map information.
 * @param asset - The asset to parse.
 * @param assets - The list of all assets.
 * @param type - The type of asset to parse.
 * @returns The parsed asset information.
 */
function parseAsset(
  asset: { name: any; source: any; info?: any },
  assets: any[],
  type: 'js/css' | 'map',
) {
  const assetName = asset.source?.name || asset.name;
  let assetContent = '';
  let assetLinesCodeList: string[] = [];
  let map: RawSourceMap | null = null;

  try {
    if (
      type === 'map' &&
      typeof assetName === 'string' &&
      assetName.endsWith('.map') &&
      !asset.name.includes('d.ts')
    ) {
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
      if (!map || !map.file) {
        logger.debug(`Failed to get source map file for asset: ${assetName}`);
        return { assetName, assetContent, assetLinesCodeList: [], map: null };
      }
      const bundledAsset = assets.find(
        (asset2) => asset2.source?.name === map?.file,
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
