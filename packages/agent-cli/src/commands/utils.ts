// --- from utils.ts ---

interface Chunk {
  size: number;
}

interface Loader {
  costs: number;
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
  return async (handler: () => Promise<unknown>): Promise<void> => {
    try {
      const result = await handler();
      if (result && typeof result === 'object' && 'ok' in result) {
        if ((result as { ok: boolean }).ok) {
          write(JSON.stringify(result, null, spacing));
        } else {
          throw new Error('Command returned ok=false');
        }
      } else {
        write(JSON.stringify(result, null, spacing));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      write(JSON.stringify({ ok: false, error: message }, null, spacing));
      throw error;
    }
  };
};

// --- new: parse subcommand-specific options from process.argv ---

/**
 * Parse subcommand-specific options (--id, --path, etc.) from process.argv.
 * CAC's allowUnknownOptions() does not parse these; we extract them manually.
 */
export function parseSubcommandOptions(
  argv: string[],
): Record<string, string | true> {
  const opts: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        opts[key] = next;
        i++;
      } else {
        opts[key] = true;
      }
    }
  }
  return opts;
}
