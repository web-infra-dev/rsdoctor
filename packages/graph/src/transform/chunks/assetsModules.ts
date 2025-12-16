import path from 'path';
import { logger, time, timeEnd } from '@rsdoctor/utils/logger';
import { SDK } from '@rsdoctor/types';
import { Lodash } from '@rsdoctor/utils/common';
import { gzipSync } from 'node:zlib';
import { ParseBundle } from '@/types/transform';

export type ParsedModuleSizeData = {
  [x: string]: { size: number; sizeConvert: string; content: string };
};
/**
 * The following code is modified based on
 * https://github.com/webpack-contrib/webpack-bundle-analyzer/blob/8a3d3f0f40010f2b41ccd28519eda5a44e13da3e/src/analyzer.js#L20
 *
 * MIT Licensed
 * Author th0r
 * Copyright JS Foundation and other contributors.
 * https://github.com/webpack-contrib/webpack-bundle-analyzer/blob/44bd8d0f9aa3b098e271af220096ea70cc44bc9e/LICENSE
 */
export async function getAssetsModulesData(
  moduleGraph: SDK.ModuleGraphInstance,
  chunkGraph: SDK.ChunkGraphInstance,
  bundleDir: string,
  opts: {
    parseBundle?: ParseBundle;
  },
  sourceMapSets: Map<string, string> = new Map(),
  assetsWithoutSourceMap?: Set<string>,
) {
  // Parse assets with sourcemap using sourcemap data
  if (sourceMapSets.size > 0) {
    time(`Start Parse bundle by sourcemap.`);
    for (const [modulePath, codes] of sourceMapSets.entries()) {
      const modules = moduleGraph.getModuleByFile(modulePath);
      let gzipSize = undefined;
      try {
        if (codes && typeof codes === 'string' && codes.length > 0) {
          gzipSize = gzipSync(codes, { level: 9 }).length;
        }
      } catch {}
      for (const module of modules) {
        module?.setSize({
          parsedSize: codes.length,
          gzipSize,
        });
        module?.setSource({ parsedSource: codes });
      }
    }
    timeEnd(`Start Parse bundle by sourcemap.`);
  }

  // Parse assets without sourcemap using AST parsing
  // Use AST parsing if:
  // 1. There are assets without sourcemap (assetsWithoutSourceMap is provided and not empty)
  // 2. OR there's no sourcemap at all (sourceMapSets.size < 1) as fallback
  const shouldUseASTParsing =
    opts.parseBundle &&
    ((assetsWithoutSourceMap && assetsWithoutSourceMap.size > 0) ||
      sourceMapSets.size < 1);
  if (shouldUseASTParsing) {
    time(`Start Parse bundle by AST.`);
    const { parseBundle = () => ({}) as ReturnType<ParseBundle> } = opts || {};

    const assets = chunkGraph.getAssets();
    const modules = moduleGraph.getModules();

    // Trying to parse bundle assets and get real module sizes if `bundleDir` is provided
    let bundlesSources: Record<string, unknown> | null = null;
    let parsedModules: ParsedModuleSizeData | null = null;

    if (bundleDir && assets.length) {
      bundlesSources = {};
      parsedModules = {};

      for (const asset of assets) {
        // If assetsWithoutSourceMap is provided, only parse assets without sourcemap
        // Otherwise (fallback case), parse all assets
        if (
          assetsWithoutSourceMap &&
          assetsWithoutSourceMap.size > 0 &&
          !assetsWithoutSourceMap.has(asset.path)
        ) {
          continue;
        }

        const assetFile = path.join(bundleDir, asset.path);
        let bundleInfo: ReturnType<ParseBundle>;
        try {
          bundleInfo = parseBundle(assetFile, modules);
        } catch (err: any) {
          const { code = '', message } = err;
          const msg = code === 'ENOENT' ? 'no such file' : message;
          process.env.DEVTOOLS_NODE_DEV === '1' &&
            logger.warn(`Error parsing bundle asset "${assetFile}": ${msg}`);

          continue;
        }

        bundlesSources[asset.path] = Lodash.pick(bundleInfo, [
          'src',
          'runtimeSrc',
        ]);
        Object.assign(parsedModules, bundleInfo?.modules || {});
      }

      if (Lodash.isEmpty(bundlesSources)) {
        bundlesSources = null;
        parsedModules = null;
        process.env.DEVTOOLS_DEV &&
          logger.warn(
            '\nNo bundles were parsed. Analyzer will show only original module sizes from stats file.\n',
          );
      }

      if (parsedModules) {
        transformAssetsModulesData(parsedModules, moduleGraph);
      }
    }
    timeEnd(`Start Parse bundle by AST.`);
  }
}

export function transformAssetsModulesData(
  parsedModulesData: ParsedModuleSizeData,
  moduleGraph: SDK.ModuleGraphInstance,
) {
  if (!moduleGraph) return;
  Object.entries(parsedModulesData).forEach(([moduleId, parsedData]) => {
    const module = moduleGraph.getModuleByWebpackId(moduleId ?? '');
    // 计算 gzip size
    let gzipSize = undefined;
    try {
      if (
        parsedData?.content &&
        typeof parsedData.content === 'string' &&
        parsedData.content.length > 0
      ) {
        gzipSize = gzipSync(parsedData.content, { level: 9 }).length;
      }
    } catch {}
    module?.setSize({
      parsedSize: parsedData?.size,
      gzipSize,
    });
    module?.setSource({ parsedSource: parsedData?.content || '' });
  });
}
