import { getChunks, getChunkById as getChunkByIdFromData } from '../datasource';
import { getMedianChunkSize, parseNumber, parsePositiveInt } from '../utils';

interface Chunk {
  size: number;
}

const omitModulesFields = <T>(value: T): T => {
  if (!value || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => omitModulesFields(item)) as T;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'modules')
      .map(([key, item]) => [key, omitModulesFields(item)]),
  ) as T;
};

export function getLargeChunksData(chunks: Chunk[]): {
  median: number;
  operator: number;
  minSizeMB: number;
  oversized: Chunk[];
} {
  const median = chunks.length ? getMedianChunkSize(chunks) : 0;
  const operator = 1.3;
  const minSizeMB = 1;
  const minSizeBytes = minSizeMB * 1024 * 1024;
  const oversized = chunks.filter(
    (chunk) => chunk.size > median * operator && chunk.size >= minSizeBytes,
  );

  return { median, operator, minSizeMB, oversized };
}

export async function listChunks(
  pageNumberInput?: string,
  pageSizeInput?: string,
): Promise<{ ok: boolean; data: unknown; description: string }> {
  const pageNumber =
    parsePositiveInt(pageNumberInput, 'pageNumber', { min: 1 }) ?? 1;
  const pageSize =
    parsePositiveInt(pageSizeInput, 'pageSize', { min: 1, max: 1000 }) ?? 100;

  const chunks = getChunks(pageNumber, pageSize);

  return {
    ok: true,
    data: omitModulesFields(chunks),
    description: 'List all chunks (id, name, size, modules).',
  };
}

export async function getChunkById(
  chunkIdInput: string | undefined,
): Promise<{ ok: boolean; data: unknown }> {
  const chunkId = parseNumber(chunkIdInput, 'id');
  if (chunkId === undefined) {
    throw new Error('Chunk id is required');
  }
  const chunk = getChunkByIdFromData(chunkId);
  if (!chunk) {
    throw new Error(`Chunk ${chunkId} not found`);
  }
  return { ok: true, data: chunk };
}

export async function findLargeChunks(): Promise<{
  ok: boolean;
  data: {
    median: number;
    operator: number;
    minSizeMB: number;
    oversized: unknown[];
  };
  description: string;
}> {
  const chunksResult = getChunks(1, Number.MAX_SAFE_INTEGER);
  const chunks = chunksResult.items || [];
  if (!chunks.length) {
    throw new Error('No chunks found.');
  }
  return {
    ok: true,
    data: omitModulesFields(getLargeChunksData(chunks)),
    description:
      'Find oversized chunks (>30% over median size and >= 1MB) to prioritize splitChunks suggestions.',
  };
}
