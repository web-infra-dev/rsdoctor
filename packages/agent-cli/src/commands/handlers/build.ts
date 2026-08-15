import {
  getChunks,
  getBuildConfig as getBuildConfigFromData,
  getBuildSummary as getBuildSummaryFromData,
  getDataFilePath,
  getEntrypoints as getEntrypointsFromData,
} from '../datasource';
import { omitModulesFields, parsePositiveInt } from '../utils';
import { getMediaAssets } from './assets';
import { getLargeChunksData } from './chunks';
import { detectDuplicatePackages, detectSimilarPackages } from './packages';
import { getTreeShakingSummary } from './tree-shaking';

interface Chunk {
  size: number;
  assets?: unknown[];
}

function limitChunkAssets(chunk: Chunk, limit: number): Chunk {
  return chunk.assets
    ? { ...chunk, assets: chunk.assets.slice(0, limit) }
    : chunk;
}

function withoutDescription<T>(result: { ok: boolean; data: T }): {
  ok: boolean;
  data: T;
} {
  return {
    ok: result.ok,
    data: result.data,
  };
}

export async function getSummary(): Promise<{
  ok: boolean;
  data: unknown;
  description: string;
}> {
  const summary = getBuildSummaryFromData();
  return {
    ok: true,
    data: summary,
    description: 'Get build summary with costs (build time analysis).',
  };
}

export async function listEntrypoints(): Promise<{
  ok: boolean;
  data: unknown;
  description: string;
}> {
  const entrypoints = getEntrypointsFromData();
  return {
    ok: true,
    data: entrypoints,
    description: 'List all entrypoints in the bundle.',
  };
}

export async function getConfig(): Promise<{
  ok: boolean;
  data: unknown;
  description: string;
}> {
  const config = getBuildConfigFromData();
  return {
    ok: true,
    data: config,
    description: 'Get build configuration (rspack/webpack config).',
  };
}

async function executeStep1(limit: number): Promise<{
  duplicatePackages: { ok: boolean; data: unknown };
  similarPackages: { ok: boolean; data: unknown };
  mediaAssets: { ok: boolean; data: unknown };
  largeChunks: { ok: boolean; data: unknown };
}> {
  const [duplicatePackages, similarPackages, mediaAssets] = await Promise.all([
    detectDuplicatePackages(),
    detectSimilarPackages(),
    getMediaAssets(limit),
  ]);

  const chunksResult = getChunks(1, Number.MAX_SAFE_INTEGER);
  const chunks = chunksResult.items || [];
  const chunksArray = chunks as Chunk[];
  const largeChunks = getLargeChunksData(chunksArray);

  return {
    duplicatePackages: omitModulesFields(withoutDescription(duplicatePackages)),
    similarPackages: omitModulesFields(withoutDescription(similarPackages)),
    mediaAssets: omitModulesFields(withoutDescription(mediaAssets)),
    largeChunks: omitModulesFields({
      ok: true,
      data: {
        ...largeChunks,
        oversized: largeChunks.oversized
          .slice(0, limit)
          .map((chunk) => limitChunkAssets(chunk, limit)),
      },
    }),
  };
}

export async function optimizeBundle(
  stepInput?: string,
  limitInput?: string,
): Promise<{ ok: boolean; data: unknown; description: string }> {
  const step = stepInput
    ? parsePositiveInt(stepInput, 'step', { min: 1, max: 2 })
    : undefined;
  const limit =
    parsePositiveInt(limitInput, 'limit', { min: 1, max: 1000 }) ?? 100;

  if (step === 1) {
    const step1Data = await executeStep1(limit);
    return {
      ok: true,
      data: {
        step: 1,
        ...step1Data,
        note: 'Step 1 completed. Use --step 2 to get tree-shaking summary.',
      },
      description:
        'Step 1: Basic bundle optimization analysis (duplicate packages, similar packages, media assets, large chunks).',
    };
  }

  if (step === 2) {
    const treeShakingSummary = await getTreeShakingSummary();

    return {
      ok: true,
      data: {
        step: 2,
        treeShakingSummary,
        note: 'Step 2 completed. Tree-shaking summary analysis.',
      },
      description:
        'Step 2: Tree-shaking summary analysis (E1007 side-effects-only imports, E1008 CJS require, and E1009 ESM-resolved-to-CJS).',
    };
  }

  const [step1Data, treeShakingSummary] = await Promise.all([
    executeStep1(limit),
    getTreeShakingSummary(),
  ]);

  return {
    ok: true,
    data: {
      ...step1Data,
      treeShakingSummary,
    },
    description:
      'Combined bundle optimization inputs: duplicate packages, similar packages, media assets, large chunks, and tree-shaking summary, with advice to optimize the bundle.',
  };
}

export async function getDataFileInfo(): Promise<{
  ok: boolean;
  data: { mode: string; dataFile: string | null; note: string };
  description: string;
}> {
  const filePath = getDataFilePath();
  return {
    ok: true,
    data: {
      mode: 'json',
      dataFile: filePath,
      note: 'Using JSON data file mode. No server required.',
    },
    description: 'Get the JSON data file path used by the CLI.',
  };
}
