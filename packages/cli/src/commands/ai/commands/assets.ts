import path from 'node:path';
import { loadJsonData } from '../datasource';
import { getAllChunks, getAssets } from '../tools';
import { requireArg } from '../utils';

interface Asset {
  path: string;
  size?: number;
  gzipSize?: number;
  chunks?: unknown[];
  content?: unknown;
}

interface Chunk {
  id: number;
  initial?: boolean;
}

interface ChunkGraph {
  assets: Asset[];
  chunks: Chunk[];
}

interface RsdoctorData {
  data?: {
    chunkGraph?: ChunkGraph;
  };
}

const Constants = {
  JSExtension: '.js',
  CSSExtension: '.css',
  HtmlExtension: '.html',
  ImgExtensions: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif'],
  MediaExtensions: ['.mp4', '.webm', '.ogg', '.mp3', '.wav', '.flac', '.aac'],
  FontExtensions: ['.woff', '.woff2', '.ttf', '.otf', '.eot'],
  MapExtensions: ['.js.map', '.css.map'],
};

const extname = (filename: string): string => {
  const baseName = filename.split('?')[0];
  const matches = baseName.match(/\.([0-9a-z]+)(?:[?#]|$)/i);
  return matches ? `.${matches[1]}` : '';
};

const isAssetMatchExtension = (asset: Asset, ext: string): boolean =>
  asset.path.slice(-ext.length) === ext || extname(asset.path) === ext;

const isAssetMatchExtensions = (asset: Asset, exts: string[]): boolean =>
  Array.isArray(exts) && exts.some((ext) => isAssetMatchExtension(asset, ext));

const filterAssetsByExtensions = (
  assets: Asset[],
  exts: string | string[],
): Asset[] => {
  if (typeof exts === 'string')
    return assets.filter((e) => isAssetMatchExtension(e, exts));
  if (Array.isArray(exts))
    return assets.filter((e) => isAssetMatchExtensions(e, exts));
  return assets;
};

const filterAssets = (
  assets: Asset[],
  filterOrExtensions?: string | string[] | ((asset: Asset) => boolean),
): Asset[] => {
  if (!filterOrExtensions) return assets;
  if (typeof filterOrExtensions === 'function')
    return assets.filter(filterOrExtensions);
  return filterAssetsByExtensions(assets, filterOrExtensions);
};

const isInitialAsset = (asset: Asset, chunks: Chunk[]): boolean => {
  const assetChunkIds = (asset.chunks || []) as Array<number | string>;
  if (!assetChunkIds.length) return false;
  const initialSet = new Set<number>(
    (chunks || []).filter((c) => c.initial).map((c) => c.id),
  );
  return assetChunkIds.some((id) => initialSet.has(Number(id)));
};

const getAssetsSizeInfo = (
  assets: Asset[],
  chunks: Chunk[],
  {
    withFileContent = false,
    filterOrExtensions,
  }: {
    withFileContent?: boolean;
    filterOrExtensions?: string | string[] | ((asset: Asset) => boolean);
  } = {},
) => {
  let filtered = assets.filter(
    (e) => !isAssetMatchExtensions(e, Constants.MapExtensions),
  );
  filtered = filterAssets(filtered, filterOrExtensions);
  return {
    count: filtered.length,
    size: filtered.reduce((t, c) => t + (c.size || 0), 0),
    files: filtered.map((e) => ({
      path: e.path,
      size: e.size || 0,
      gzipSize: e.gzipSize,
      initial: isInitialAsset(e, chunks),
      content: withFileContent ? e.content : undefined,
    })),
  };
};

const getInitialAssetsSizeInfo = (
  assets: Asset[],
  chunks: Chunk[],
  options: {
    withFileContent?: boolean;
    filterOrExtensions?: string | string[] | ((asset: Asset) => boolean);
  } = {},
) =>
  getAssetsSizeInfo(assets, chunks, {
    ...options,
    filterOrExtensions: (asset: Asset) => isInitialAsset(asset, chunks),
  });

const diffSize = (
  bSize: number,
  cSize: number,
): { percent: number; state: 'Equal' | 'Down' | 'Up' } => {
  const isEqual = bSize === cSize;
  const percent = isEqual
    ? 0
    : bSize === 0
      ? 100
      : (Math.abs(cSize - bSize) / bSize) * 100;
  const state = isEqual ? 'Equal' : bSize > cSize ? 'Down' : 'Up';
  return { percent, state };
};

const diffAssetsByExtensions = (
  baseline: ChunkGraph,
  current: ChunkGraph,
  filterOrExtensions?: string | string[] | ((asset: Asset) => boolean),
  isInitial = false,
) => {
  const { size: bSize, count: bCount } = isInitial
    ? getInitialAssetsSizeInfo(baseline.assets, baseline.chunks, {
        filterOrExtensions,
      })
    : getAssetsSizeInfo(baseline.assets, baseline.chunks, {
        filterOrExtensions,
      });
  const { size: cSize, count: cCount } = isInitial
    ? getInitialAssetsSizeInfo(current.assets, current.chunks, {
        filterOrExtensions,
      })
    : getAssetsSizeInfo(current.assets, current.chunks, { filterOrExtensions });
  const { percent, state } = diffSize(bSize, cSize);
  return {
    size: { baseline: bSize, current: cSize },
    count: { baseline: bCount, current: cCount },
    percent,
    state,
  };
};

const getAssetsDiffResult = (baseline: ChunkGraph, current: ChunkGraph) => ({
  all: { total: diffAssetsByExtensions(baseline, current) },
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
    total: diffAssetsByExtensions(baseline, current, Constants.MediaExtensions),
  },
  fonts: {
    total: diffAssetsByExtensions(baseline, current, Constants.FontExtensions),
  },
  others: {
    total: diffAssetsByExtensions(
      baseline,
      current,
      (asset: Asset) =>
        !isAssetMatchExtensions(asset, [
          Constants.JSExtension,
          Constants.CSSExtension,
          Constants.HtmlExtension,
          ...Constants.ImgExtensions,
          ...Constants.MediaExtensions,
          ...Constants.FontExtensions,
          ...Constants.MapExtensions,
        ]),
    ),
  },
});

export async function listAssets(): Promise<{
  ok: boolean;
  data: unknown;
  description: string;
}> {
  const assets = await getAssets();
  return {
    ok: true,
    data: assets,
    description: 'List all assets with size information.',
  };
}

export async function diffAssets(
  baselineInput: string | undefined,
  currentInput: string | undefined,
): Promise<{
  ok: boolean;
  data: { note: string; baseline: string; current: string; diff: unknown };
  description: string;
}> {
  const baselinePath = path.resolve(requireArg(baselineInput, 'baseline'));
  const currentPath = path.resolve(requireArg(currentInput, 'current'));

  const baselineData = loadJsonData(baselinePath) as RsdoctorData;
  const currentData = loadJsonData(currentPath) as RsdoctorData;

  const baselineGraph = baselineData?.data?.chunkGraph;
  const currentGraph = currentData?.data?.chunkGraph;

  if (!baselineGraph) throw new Error(`Invalid baseline file: ${baselinePath}`);
  if (!currentGraph) throw new Error(`Invalid current file: ${currentPath}`);

  const diff = getAssetsDiffResult(baselineGraph, currentGraph);
  return {
    ok: true,
    data: {
      note: 'Diff compares asset count and size across extensions; initial = entry-loaded assets only.',
      baseline: baselinePath,
      current: currentPath,
      diff,
    },
    description:
      'Diff asset counts and sizes between two rsdoctor-data.json files (baseline vs current).',
  };
}

export async function getMediaAssets(): Promise<{
  ok: boolean;
  data: { guidance: string; chunks: unknown };
  description: string;
}> {
  const chunksResult = await getAllChunks(1, Number.MAX_SAFE_INTEGER);
  const chunksResultTyped = chunksResult as { items?: unknown } | unknown[];
  const chunks = Array.isArray(chunksResultTyped)
    ? chunksResultTyped
    : chunksResultTyped.items || chunksResult;
  return {
    ok: true,
    data: { guidance: 'Media asset optimization guidance.', chunks },
    description: 'Media asset optimization guidance.',
  };
}
