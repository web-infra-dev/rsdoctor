import { Client, Constants, SDK } from '@rsdoctor/types';
import { getChunksByAsset } from './chunk';
import { getModulesByAsset } from './modules';

const EXT = 'js|css|html';

// More strict hash pattern: matches hex strings (0-9a-f) or alphanumeric strings containing digits
// This avoids matching common words like "basic", "main", "v2", etc.
// Pattern breakdown:
// - [a-f0-9]{4,32}: hex strings (4-32 chars)
// - [a-zA-Z]*[0-9][a-zA-Z0-9]{3,31}: alphanumeric strings with at least one digit
//   Total length must be 4-32 chars (enforced by filenamePattern context)
//   Minimum 4 characters to avoid matching very short strings like "v2" (2 chars)
const hashPattern = /(?:[a-f0-9]{4,32}|[a-zA-Z]*[0-9][a-zA-Z0-9]{3,31})/;

const hashSeparatorPattern = /[-|.]/;

const fileExtensionPattern = /(?:\.[a-z｜A-Z|0-9]{2,}){1,}/;

const filenamePattern = new RegExp(
  `(.*)${hashSeparatorPattern.source}(${hashPattern.source})(${fileExtensionPattern.source})$`,
);

export function formatAssetName(assetName: string, fileConfig?: string) {
  // remove hash from filename
  // - [name].[hash].[ext] -> [name].[ext]
  // - [name]-[hash].[ext] -> [name].[ext]
  // - [dir][name].[hash].[ext] -> [dir][name].[ext]
  // - [dir][name]-[hash].[ext] -> [dir][name].[ext]
  const splitFilesList = fileConfig?.split('.');
  let outputFileTailName = '';
  let unHashedFileName = assetName;
  if (
    splitFilesList?.length &&
    splitFilesList.length >= 3 &&
    splitFilesList[splitFilesList.length - 2]?.indexOf('[') < 0 &&
    EXT.indexOf(splitFilesList[splitFilesList.length - 1]) > -1
  ) {
    outputFileTailName = splitFilesList[splitFilesList.length - 2];
    const _regPattern =
      /(.*)(\.([a-f0-9]{4,32}|[a-zA-Z]*[0-9][a-zA-Z0-9]*))(\.[^.]+){2,}$/;
    const match = assetName.match(_regPattern);
    if (match && match[3].length >= 4 && match[3].length <= 32) {
      unHashedFileName = match[1];
      return `${unHashedFileName}.${outputFileTailName}.${assetName.substring(
        assetName.lastIndexOf('.') + 1,
      )}`;
    }
  }
  // When fileConfig contains [hash] or no fileConfig, use filenamePattern
  // This uses stricter matching to avoid false positives like "v2", "basic", etc.
  // filenamePattern structure: (.*)[separator](hash)(extension) - separator is not captured
  // So groups are: 1=filename, 2=hash, 3=extension
  // Check if match exists and hash length is 4-32 chars
  const match = assetName.match(filenamePattern);
  if (match && match[2] && match[2].length >= 4 && match[2].length <= 32) {
    return assetName.replace(filenamePattern, '$1$3');
  }
  return assetName;
}

export function isAssetMatchExtension(asset: SDK.AssetData, ext: string) {
  return asset.path.slice(-ext.length) === ext || extname(asset.path) === ext;
}

export function isAssetMatchExtensions(asset: SDK.AssetData, exts: string[]) {
  if (!exts.length) return false;
  return exts.some((ext) => isAssetMatchExtension(asset, ext));
}

export function filterAssetsByExtensions(
  assets: SDK.AssetData[],
  exts: string | string[],
) {
  if (typeof exts === 'string')
    return assets.filter((e) => isAssetMatchExtension(e, exts));

  if (Array.isArray(exts)) {
    return assets.filter((e) => isAssetMatchExtensions(e, exts));
  }

  return [];
}

type FilterFunctionOrExtensions =
  | string
  | string[]
  | ((asset: SDK.AssetData) => boolean);

interface GetAssetsOptions {
  /**
   * turn off it when you need not file content.
   * @default true
   */
  withFileContent?: boolean;
  /**
   * filter with assets
   */
  filterOrExtensions?: FilterFunctionOrExtensions;
}

export function filterAssets(
  assets: SDK.AssetData[],
  filterOrExtensions?: FilterFunctionOrExtensions,
) {
  if (filterOrExtensions) {
    if (typeof filterOrExtensions === 'function') {
      assets = assets.filter(filterOrExtensions);
    } else {
      assets = filterAssetsByExtensions(assets, filterOrExtensions);
    }
  }

  return assets;
}

export function getAssetsSizeInfo(
  assets: SDK.AssetData[],
  chunks: SDK.ChunkData[],
  options: GetAssetsOptions = {},
) {
  const { withFileContent = true, filterOrExtensions } = options;

  assets = assets.filter(
    (e) => !isAssetMatchExtensions(e, Constants.MapExtensions),
  );

  if (filterOrExtensions) {
    assets = filterAssets(assets, filterOrExtensions);
  }

  if (assets.length) {
    return {
      count: assets.length,
      size: assets.reduce((t, c) => t + c.size, 0),
      files: assets.map((e) => ({
        path: e.path,
        size: e.size,
        gzipSize: e.gzipSize,
        initial: isInitialAsset(e, chunks),
        content: withFileContent ? e.content : undefined,
      })),
    };
  }

  return {
    count: 0,
    size: 0,
    files: [],
  };
}

export function isInitialAsset(asset: SDK.AssetData, chunks: SDK.ChunkData[]) {
  const cks = getChunksByAsset(asset, chunks);

  return cks.some((e) => Boolean(e.initial));
}

export function getInitialAssetsSizeInfo(
  assets: SDK.AssetData[],
  chunks: SDK.ChunkData[],
  options: GetAssetsOptions = {},
) {
  if (options.filterOrExtensions) {
    assets = filterAssets(assets, options.filterOrExtensions);
  }
  return getAssetsSizeInfo(assets, chunks, {
    ...options,
    filterOrExtensions: (asset) => isInitialAsset(asset, chunks),
  });
}

export function getAssetsDiffResult(
  baseline: SDK.ChunkGraphData,
  current: SDK.ChunkGraphData,
): Client.RsdoctorClientAssetsDiffResult {
  return {
    all: {
      total: diffAssetsByExtensions(baseline, current),
    },
    js: {
      total: diffAssetsByExtensions(baseline, current, Constants.JSExtension),
      initial: diffAssetsByExtensions(
        baseline,
        current,
        Constants.JSExtension,
        true,
      ),
    },
    css: {
      total: diffAssetsByExtensions(baseline, current, Constants.CSSExtension),
      initial: diffAssetsByExtensions(
        baseline,
        current,
        Constants.CSSExtension,
        true,
      ),
    },
    imgs: {
      total: diffAssetsByExtensions(baseline, current, Constants.ImgExtensions),
    },
    html: {
      total: diffAssetsByExtensions(baseline, current, Constants.HtmlExtension),
    },
    media: {
      total: diffAssetsByExtensions(
        baseline,
        current,
        Constants.MediaExtensions,
      ),
    },
    fonts: {
      total: diffAssetsByExtensions(
        baseline,
        current,
        Constants.FontExtensions,
      ),
    },
    others: {
      total: diffAssetsByExtensions(
        baseline,
        current,
        (asset) =>
          !isAssetMatchExtensions(
            asset,
            [
              Constants.JSExtension,
              Constants.CSSExtension,
              Constants.HtmlExtension,
            ].concat(
              Constants.ImgExtensions,
              Constants.MediaExtensions,
              Constants.FontExtensions,
              Constants.MapExtensions,
            ),
          ),
      ),
    },
  };
}

/**
 * @param bSize size of baseline
 * @param cSize size of current
 */
export function diffSize(bSize: number, cSize: number) {
  const isEqual = bSize === cSize;

  const percent = isEqual
    ? 0
    : bSize === 0
      ? 100
      : (Math.abs(cSize - bSize) / bSize) * 100;

  const state: Client.RsdoctorClientDiffState = isEqual
    ? Client.RsdoctorClientDiffState.Equal
    : bSize > cSize
      ? Client.RsdoctorClientDiffState.Down
      : Client.RsdoctorClientDiffState.Up;

  return { percent, state };
}

export function diffAssetsByExtensions(
  baseline: SDK.ChunkGraphData,
  current: SDK.ChunkGraphData,
  filterOrExtensions?: FilterFunctionOrExtensions,
  isInitial = false,
): Client.RsdoctorClientAssetsDiffItem {
  const { size: bSize, count: bCount } = isInitial
    ? getInitialAssetsSizeInfo(baseline.assets, baseline.chunks, {
        filterOrExtensions,
      })
    : getAssetsSizeInfo(baseline.assets, baseline.chunks, {
        filterOrExtensions,
      });

  let cSize: number;
  let cCount: number;

  // is same
  if (baseline === current) {
    cSize = bSize;
    cCount = bCount;
  } else {
    const { size, count } = isInitial
      ? getInitialAssetsSizeInfo(current.assets, current.chunks, {
          filterOrExtensions,
        })
      : getAssetsSizeInfo(current.assets, current.chunks, {
          filterOrExtensions,
        });
    cSize = size;
    cCount = count;
  }

  const { percent, state } = diffSize(bSize, cSize);

  return {
    size: {
      baseline: bSize,
      current: cSize,
    },
    count: {
      baseline: bCount,
      current: cCount,
    },
    percent,
    state,
  };
}

export function getAssetsSummary(
  assets: SDK.AssetData[],
  chunks: SDK.ChunkData[],
  options: Omit<GetAssetsOptions, 'filterOrExtensions'> = {},
): Client.RsdoctorClientAssetsSummary {
  const jsOpt: GetAssetsOptions = {
    ...options,
    filterOrExtensions: Constants.JSExtension,
  };
  const cssOpt: GetAssetsOptions = {
    ...options,
    filterOrExtensions: Constants.CSSExtension,
  };
  const imgOpt: GetAssetsOptions = {
    ...options,
    filterOrExtensions: Constants.ImgExtensions,
  };
  const htmlOpt: GetAssetsOptions = {
    ...options,
    filterOrExtensions: Constants.HtmlExtension,
  };
  const mediaOpt: GetAssetsOptions = {
    ...options,
    filterOrExtensions: Constants.MediaExtensions,
  };
  const fontOpt: GetAssetsOptions = {
    ...options,
    filterOrExtensions: Constants.FontExtensions,
  };
  const otherOpt: GetAssetsOptions = {
    ...options,
    filterOrExtensions: (asset) =>
      !isAssetMatchExtensions(
        asset,
        [
          Constants.JSExtension,
          Constants.CSSExtension,
          Constants.HtmlExtension,
        ].concat(
          Constants.ImgExtensions,
          Constants.MediaExtensions,
          Constants.FontExtensions,
          Constants.MapExtensions,
        ),
      ),
  };

  return {
    all: {
      total: getAssetsSizeInfo(assets, chunks, options),
    },
    js: {
      total: getAssetsSizeInfo(assets, chunks, jsOpt),
      initial: getInitialAssetsSizeInfo(assets, chunks, jsOpt),
    },
    css: {
      total: getAssetsSizeInfo(assets, chunks, cssOpt),
      initial: getInitialAssetsSizeInfo(assets, chunks, cssOpt),
    },
    imgs: {
      total: getAssetsSizeInfo(assets, chunks, imgOpt),
    },
    html: {
      total: getAssetsSizeInfo(assets, chunks, htmlOpt),
    },
    media: {
      total: getAssetsSizeInfo(assets, chunks, mediaOpt),
    },
    fonts: {
      total: getAssetsSizeInfo(assets, chunks, fontOpt),
    },
    others: {
      total: getAssetsSizeInfo(assets, chunks, otherOpt),
    },
  };
}

export function getAssetDetails(
  assetPath: string,
  assets: SDK.AssetData[],
  chunks: SDK.ChunkData[],
  modules: SDK.ModuleData[],
  checkModules: (module: SDK.ModuleData) => boolean,
): SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetAssetDetails> {
  const asset = assets.find((e) => e.path === assetPath)!;
  return {
    asset,
    chunks: getChunksByAsset(asset, chunks),
    modules: getModulesByAsset(asset, chunks, modules, undefined, checkModules),
  };
}

export function getAllBundleData(
  assets: SDK.AssetData[],
  chunks: SDK.ChunkData[],
  modules: SDK.ModuleData[],
  filtersModules?: (keyof SDK.ModuleData)[],
): SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetSummaryBundles> {
  const result = [];
  try {
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      result.push({
        asset,
        modules: getModulesByAsset(asset, chunks, modules, filtersModules),
      });
    }
    return result;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export function extname(filename: string) {
  // 移除查询参数部分
  const baseName = filename.split('?')[0];
  // 使用正则表达式匹配扩展名
  const matches = baseName.match(/\.([0-9a-z]+)(?:[\?#]|$)/i);
  return matches ? `.${matches[1]}` : '';
}
