import path from 'path';
import { logger } from '@rsdoctor/utils/logger';
import { SDK } from '@rsdoctor/types';
import { ParseBundle } from '@/types';
import { Lodash } from '@rsdoctor/utils/common';

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
) {
  if (opts.parseBundle) {
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
  }

  for (const [modulePath, codes] of sourceMapSets.entries()) {
    const module = moduleGraph.getModuleByFile(modulePath);
    if (!module) continue;
    module?.setSize({
      parsedSize: codes.length,
    });
    module?.setSource({ parsedSource: codes });
  }
}

export function transformAssetsModulesData(
  parsedModulesData: ParsedModuleSizeData,
  moduleGraph: SDK.ModuleGraphInstance,
) {
  if (!moduleGraph) return;
  Object.entries(parsedModulesData).forEach(([moduleId, parsedData]) => {
    const module = moduleGraph.getModuleByWebpackId(moduleId ?? '');
    module?.setSize({
      parsedSize: parsedData?.size,
    });
    module?.setSource({ parsedSource: parsedData?.content || '' });
  });
}
