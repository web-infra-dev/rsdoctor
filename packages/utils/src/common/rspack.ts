import { SDK } from '@rsdoctor/types';

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
export function checkSourceMapSupport(configs: SDK.WebpackConfigData[]) {
  if (!Array.isArray(configs) || !configs[0]) {
    return {
      isRspack: false,
      hasSourceMap: false,
    };
  }

  const isRspack =
    configs[0].name === 'rspack' && configs[0]?.config?.name !== 'lynx';
  const devtool = configs[0].config?.devtool;
  const plugins = configs[0].config?.plugins as string[];
  const hasLynxSourcemapPlugin = plugins?.filter(
    (plugin) => plugin && plugin.includes('SourceMapDevToolPlugin'),
  );

  const hasSourceMap =
    (typeof devtool === 'string' &&
      devtool.includes('source-map') &&
      !devtool.includes('eval')) ||
    !!hasLynxSourcemapPlugin?.length;

  return {
    isRspack,
    hasSourceMap,
  };
}
