import {
  getChunks,
  getBuildConfig as getBuildConfigFromData,
  getBuildSummary as getBuildSummaryFromData,
  getDataFilePath,
  getEntrypoints as getEntrypointsFromData,
  getPackages,
  getRules,
  getSideEffects,
} from '../datasource';
import { getMedianChunkSize, parsePositiveInt } from '../utils';

interface Rule {
  description?: string;
}

interface Package {
  name: string;
}

interface Chunk {
  size: number;
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

async function executeStep1(): Promise<{
  duplicatePackages: { ok: boolean; data: unknown };
  similarPackages: { ok: boolean; data: unknown };
  mediaAssets: { ok: boolean; data: unknown };
  largeChunks: { ok: boolean; data: unknown };
}> {
  const rules = getRules() as Rule[];
  const packages = getPackages() as Package[];
  const chunksResult = getChunks(1, Number.MAX_SAFE_INTEGER);

  const chunks = chunksResult.items || [];

  const duplicateRule = rules?.find((rule) =>
    rule.description?.includes('E1001'),
  );

  const similarRules = [
    ['lodash', 'lodash-es', 'string_decode'],
    ['dayjs', 'moment', 'date-fns', 'js-joda'],
    ['antd', 'material-ui', 'semantic-ui-react', 'arco-design'],
    ['axios', 'node-fetch'],
    ['redux', 'mobx', 'zustand', 'recoil', 'jotai'],
    ['chalk', 'colors', 'picocolors', 'kleur'],
    ['fs-extra', 'graceful-fs'],
  ];

  const similarMatches = similarRules
    .map((group) => {
      const found = group.filter((pkg) =>
        packages.some((p) => p.name.toLowerCase() === pkg.toLowerCase()),
      );
      return found.length > 1 ? found : null;
    })
    .filter((match): match is string[] => match !== null);

  const mediaAssets = {
    guidance: 'Media asset optimization guidance.',
    chunks,
  };

  const chunksArray = chunks as Chunk[];
  const median = chunksArray.length ? getMedianChunkSize(chunksArray) : 0;
  const operator = 1.3;
  const minSizeMB = 1;
  const minSizeBytes = minSizeMB * 1024 * 1024;
  const oversized = chunksArray.filter(
    (chunk) => chunk.size > median * operator && chunk.size >= minSizeBytes,
  );

  return {
    duplicatePackages: {
      ok: true,
      data: {
        rule: duplicateRule ?? null,
        totalRules: rules?.length ?? 0,
        note: duplicateRule
          ? undefined
          : 'No E1001 duplicate package rule found in current analysis.',
      },
    },
    similarPackages: {
      ok: true,
      data: {
        similarPackages: similarMatches,
        totalPackages: packages.length,
        note: similarMatches.length
          ? undefined
          : 'No similar package groups detected in current analysis.',
      },
    },
    mediaAssets: { ok: true, data: mediaAssets },
    largeChunks: { ok: true, data: { median, operator, minSizeMB, oversized } },
  };
}

export async function optimizeBundle(
  stepInput?: string,
  sideEffectsPageNumberInput?: string,
  sideEffectsPageSizeInput?: string,
): Promise<{ ok: boolean; data: unknown; description: string }> {
  const step = stepInput
    ? parsePositiveInt(stepInput, 'step', { min: 1, max: 2 })
    : undefined;

  if (step === 1) {
    const step1Data = await executeStep1();
    return {
      ok: true,
      data: {
        step: 1,
        ...step1Data,
        note: 'Step 1 completed. Use --step 2 to get side effects modules.',
      },
      description:
        'Step 1: Basic bundle optimization analysis (duplicate packages, similar packages, media assets, large chunks).',
    };
  }

  if (step === 2) {
    const pageNumber =
      parsePositiveInt(sideEffectsPageNumberInput, 'sideEffectsPageNumber', {
        min: 1,
      }) ?? 1;
    const pageSize =
      parsePositiveInt(sideEffectsPageSizeInput, 'sideEffectsPageSize', {
        min: 1,
        max: 1000,
      }) ?? 100;

    const sideEffectsData = getSideEffects(pageNumber, pageSize);

    return {
      ok: true,
      data: {
        step: 2,
        sideEffectsModules: { ok: true, data: sideEffectsData },
        pagination: { pageNumber, pageSize },
        note: 'Step 2 completed. Side effects modules analysis with pagination.',
      },
      description:
        'Step 2: Side effects modules analysis (categorized by node_modules and user code, with package statistics).',
    };
  }

  const defaultPageNumber =
    parsePositiveInt(sideEffectsPageNumberInput, 'sideEffectsPageNumber', {
      min: 1,
    }) ?? 1;
  const defaultPageSize =
    parsePositiveInt(sideEffectsPageSizeInput, 'sideEffectsPageSize', {
      min: 1,
      max: 1000,
    }) ?? 100;

  const [step1Data, sideEffectsData] = await Promise.all([
    executeStep1(),
    getSideEffects(defaultPageNumber, defaultPageSize),
  ]);

  return {
    ok: true,
    data: {
      ...step1Data,
      sideEffectsModules: { ok: true, data: sideEffectsData },
    },
    description:
      'Combined bundle optimization inputs: duplicate packages, similar packages, media assets, large chunks, and side effects modules, with advice to optimize the bundle.',
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
