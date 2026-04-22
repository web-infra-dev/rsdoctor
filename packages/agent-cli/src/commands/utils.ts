import { cac } from 'cac';

// --- from utils.ts ---

interface Chunk {
  size: number;
}

interface Loader {
  costs: number;
}

export interface PaginationResult<T> {
  total: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  items: T[];
}

export const getMedianChunkSize = (list: Chunk[]): number => {
  const sorted = [...list].sort((a, b) => a.size - b.size);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1].size + sorted[middle].size) / 2;
  }
  return sorted[middle].size;
};

export const getTopThirdLoadersByCosts = (loaders: Loader[]): Loader[] => {
  const sorted = [...loaders].sort((a, b) => b.costs - a.costs);
  const count = Math.ceil(sorted.length / 3);
  return sorted.slice(0, count);
};

// --- from utils/cli-utils.ts ---

export function requireArg(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

export function parseBoolean(
  value: string | undefined,
  fallback?: boolean,
): boolean | undefined {
  if (value === undefined) {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  if (
    normalized === 'true' ||
    normalized === '1' ||
    normalized === 'yes' ||
    normalized === 'y'
  ) {
    return true;
  }
  if (
    normalized === 'false' ||
    normalized === '0' ||
    normalized === 'no' ||
    normalized === 'n'
  ) {
    return false;
  }
  throw new Error(`Invalid boolean value: ${value}`);
}

export function parseNumber(
  value: string | undefined,
  name: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${name}: ${value}`);
  }
  return parsed;
}

export function parsePositiveInt(
  value: string | undefined,
  name: string,
  range: { min?: number; max?: number } = {},
): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new Error(`Invalid ${name}: ${value}`);
  }
  if (range.min !== undefined && parsed < range.min) {
    throw new Error(`${name} must be >= ${range.min}.`);
  }
  if (range.max !== undefined && parsed > range.max) {
    throw new Error(`${name} must be <= ${range.max}.`);
  }
  return parsed;
}

export function parseCommaList(value: string | true | undefined): string[] {
  if (value === undefined || value === true) {
    return [];
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseModulesInput(
  value: string | true | string[] | number[] | undefined,
): Array<string | number> {
  if (value === undefined || value === true) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return parseCommaList(value);
}

export function paginateItems<T>(
  items: T[],
  pageNumber: number,
  pageSize: number,
): PaginationResult<T> {
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (pageNumber - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return {
    total,
    pageNumber,
    pageSize,
    totalPages,
    items: items.slice(startIndex, endIndex),
  };
}

export function printResult(result: unknown, compact: boolean = false): void {
  if (result === undefined) {
    return;
  }
  const spacing = compact ? 0 : 2;
  console.log(JSON.stringify(result, null, spacing));
}

// --- executor ---

export const createExecutor = (
  compact: boolean,
  options?: { write?: (text: string) => void },
) => {
  const spacing = compact ? 0 : 2;
  const write = options?.write ?? ((text: string) => console.log(text));
  return async (handler: () => Promise<unknown>): Promise<boolean> => {
    try {
      const result = await handler();
      if (result && typeof result === 'object' && 'ok' in result) {
        write(JSON.stringify(result, null, spacing));
        return (result as { ok: boolean }).ok;
      } else {
        write(JSON.stringify(result, null, spacing));
        return true;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      write(JSON.stringify({ ok: false, error: message }, null, spacing));
      throw error;
    }
  };
};

export function parseSubcommandOptions(
  argv: string[],
): Record<string, string | true> {
  const parsed = cac('rsdoctor-agent').parse(
    ['node', 'rsdoctor-agent', ...argv],
    { run: false },
  );
  const opts: Record<string, string | true> = {};

  for (const [key, value] of Object.entries(parsed.options)) {
    if (key === '--') {
      continue;
    }
    const optionName = key.replace(
      /[A-Z]/g,
      (char) => `-${char.toLowerCase()}`,
    );
    opts[optionName] = value === true ? true : String(value);
  }

  return opts;
}
