import { SDK } from '../types';

export const RspackLoaderInternalPropertyName = '__l__';

export enum RspackSummaryCostsDataName {
  Bootstrap = 'bootstrap->rspack:beforeCompile',
  Compile = 'rspack:beforeCompile->afterCompile',
  Done = 'rspack:afterCompile->done',
  Minify = 'rspack:minify(rspack:optimizeChunkAssets)',
}

/**
 * Check if the compiler configuration supports source maps
 * @param configs - Array of compiler configurations
 * @returns Object containing compiler type and source map support status
 */
export function checkSourceMapSupport(configs: SDK.BundlerConfigData[]) {
  if (!Array.isArray(configs) || !configs[0]) {
    return {
      isRspack: false,
      hasSourceMap: false,
      isLynx: false,
      isEvalSourceMap: false,
    };
  }

  const config = configs[0].config;
  const isLynx = config?.name === 'lynx';
  const isRspack = configs[0].name === 'rspack' && !isLynx;
  const devtool = config?.devtool;
  const isEvalSourceMap = typeof devtool === 'string' && /eval/i.test(devtool);
  const plugins = config?.plugins as string[];
  const hasLynxSourcemapPlugin = plugins?.filter(
    (plugin) => plugin && plugin.includes('SourceMapDevToolPlugin'),
  );

  const hasSourceMap =
    (typeof devtool === 'string' &&
      devtool.includes('source-map') &&
      !isEvalSourceMap) ||
    !!hasLynxSourcemapPlugin?.length;

  return {
    isRspack,
    hasSourceMap,
    isLynx,
    isEvalSourceMap,
  };
}
