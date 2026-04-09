import { setDataFilePath } from './datasource';
import { createExecutor } from './executor';
import { parseSubcommandOptions } from './utils';

import { findLargeChunks, getChunkById, listChunks } from './handlers/chunks';
import {
  getModuleById,
  getModuleByPath,
  getModuleExports,
  getModuleIssuerPath,
  getSideEffects,
} from './handlers/modules';
import {
  detectDuplicatePackages,
  detectSimilarPackages,
  getPackageByName,
  getPackageDependencies,
  listPackages,
} from './handlers/packages';
import { diffAssets, getMediaAssets, listAssets } from './handlers/assets';
import { getDirectories, getHotFiles } from './handlers/loaders';
import {
  getConfig,
  getSummary,
  listEntrypoints,
  optimizeBundle,
} from './handlers/build';
import {
  getErrorsByCode,
  getErrorsByLevel,
  listErrors,
} from './handlers/errors';
import { listRules } from './handlers/rules';
import { getPort } from './handlers/server';
import {
  detectCjsRequire,
  detectEsmResolvedToCjs,
  detectSideEffectsOnlyImports,
  getBailoutModules,
  getExportsAnalysis,
  getTreeShakingSummary,
} from './handlers/tree-shaking';

interface OptionDef {
  name: string;
  description: string;
  required: boolean;
  type?: 'string' | 'integer' | 'number' | 'boolean';
  default?: unknown;
  enum?: (string | number)[];
  minimum?: number;
  maximum?: number;
}

interface SubcommandDef {
  description: string;
  options: OptionDef[];
  handler: (opts: Record<string, string | true>) => Promise<unknown>;
}

const SUBCOMMANDS: Record<string, Record<string, SubcommandDef>> = {
  chunks: {
    list: {
      description: 'List all chunks (id, name, size, modules).',
      options: [
        {
          name: '--page-number',
          description: 'Page number (default: 1)',
          required: false,
          type: 'integer',
          default: 1,
          minimum: 1,
        },
        {
          name: '--page-size',
          description: 'Page size (default: 100, max: 1000)',
          required: false,
          type: 'integer',
          default: 100,
          minimum: 1,
          maximum: 1000,
        },
      ],
      handler: (opts) =>
        listChunks(opts['page-number'] as string, opts['page-size'] as string),
    },
    'by-id': {
      description: 'Get chunk detail by numeric id.',
      options: [
        {
          name: '--id',
          description: 'Chunk id',
          required: true,
          type: 'string',
        },
      ],
      handler: (opts) => getChunkById(opts['id'] as string),
    },
    large: {
      description:
        'Find oversized chunks (>30% over median size and >= 1MB) to prioritize splitChunks suggestions.',
      options: [],
      handler: () => findLargeChunks(),
    },
  },

  modules: {
    'by-id': {
      description: 'Get module detail by id (webpack/rspack).',
      options: [
        {
          name: '--id',
          description: 'Module id',
          required: true,
          type: 'string',
        },
      ],
      handler: (opts) => getModuleById(opts['id'] as string),
    },
    'by-path': {
      description:
        'Get module detail by name or path; if multiple match, list them.',
      options: [
        {
          name: '--path',
          description: 'Module name or path',
          required: true,
          type: 'string',
        },
      ],
      handler: (opts) => getModuleByPath(opts['path'] as string),
    },
    issuer: {
      description: 'Trace issuer/import chain for a module.',
      options: [
        {
          name: '--id',
          description: 'Module id',
          required: true,
          type: 'string',
        },
      ],
      handler: (opts) => getModuleIssuerPath(opts['id'] as string),
    },
    exports: {
      description: 'Get module exports information.',
      options: [],
      handler: () => getModuleExports(),
    },
    'side-effects': {
      description:
        'Get modules with side effects based on bailoutReason, categorized by node_modules and user code.',
      options: [
        {
          name: '--page-number',
          description: 'Page number (default: 1)',
          required: false,
          type: 'integer',
          default: 1,
          minimum: 1,
        },
        {
          name: '--page-size',
          description: 'Page size (default: 100, max: 1000)',
          required: false,
          type: 'integer',
          default: 100,
          minimum: 1,
          maximum: 1000,
        },
      ],
      handler: (opts) =>
        getSideEffects(
          opts['page-number'] as string,
          opts['page-size'] as string,
        ),
    },
  },

  packages: {
    list: {
      description: 'List packages with size/duplication info.',
      options: [
        {
          name: '--page-number',
          description: 'Page number (default: 1)',
          required: false,
          type: 'integer',
          default: 1,
          minimum: 1,
        },
        {
          name: '--page-size',
          description: 'Page size (default: 100, max: 1000)',
          required: false,
          type: 'integer',
          default: 100,
          minimum: 1,
          maximum: 1000,
        },
      ],
      handler: (opts) =>
        listPackages(
          opts['page-number'] as string,
          opts['page-size'] as string,
        ),
    },
    'by-name': {
      description: 'Get package entries by name.',
      options: [
        {
          name: '--name',
          description: 'Package name',
          required: true,
          type: 'string',
        },
      ],
      handler: (opts) => getPackageByName(opts['name'] as string),
    },
    dependencies: {
      description: 'Get package dependency graph.',
      options: [
        {
          name: '--page-number',
          description: 'Page number (default: 1)',
          required: false,
          type: 'integer',
          default: 1,
          minimum: 1,
        },
        {
          name: '--page-size',
          description: 'Page size (default: 100, max: 1000)',
          required: false,
          type: 'integer',
          default: 100,
          minimum: 1,
          maximum: 1000,
        },
      ],
      handler: (opts) =>
        getPackageDependencies(
          opts['page-number'] as string,
          opts['page-size'] as string,
        ),
    },
    duplicates: {
      description:
        'Detect duplicate packages using E1001 overlay rule if present.',
      options: [],
      handler: () => detectDuplicatePackages(),
    },
    similar: {
      description: 'Detect similar packages (lodash/lodash-es etc.).',
      options: [],
      handler: () => detectSimilarPackages(),
    },
  },

  assets: {
    list: {
      description: 'List all assets with size information.',
      options: [],
      handler: () => listAssets(),
    },
    diff: {
      description:
        'Diff asset counts and sizes between two rsdoctor-data.json files (baseline vs current).',
      options: [
        {
          name: '--baseline',
          description: 'Path to baseline rsdoctor-data.json',
          required: true,
          type: 'string',
        },
        {
          name: '--current',
          description: 'Path to current rsdoctor-data.json',
          required: true,
          type: 'string',
        },
      ],
      handler: (opts) =>
        diffAssets(opts['baseline'] as string, opts['current'] as string),
    },
    media: {
      description: 'Media asset optimization guidance.',
      options: [],
      handler: () => getMediaAssets(),
    },
  },

  loaders: {
    'hot-files': {
      description:
        'Top third slowest loader/file pairs to surface expensive transforms.',
      options: [
        {
          name: '--page-number',
          description: 'Page number (default: 1)',
          required: false,
          type: 'integer',
          default: 1,
          minimum: 1,
        },
        {
          name: '--page-size',
          description: 'Page size (default: 100, max: 1000)',
          required: false,
          type: 'integer',
          default: 100,
          minimum: 1,
          maximum: 1000,
        },
        {
          name: '--min-costs',
          description: 'Minimum costs threshold (ms)',
          required: false,
          type: 'number',
        },
      ],
      handler: (opts) =>
        getHotFiles(
          opts['page-number'] as string,
          opts['page-size'] as string,
          opts['min-costs'] as string,
        ),
    },
    directories: {
      description: 'Loader times grouped by directory.',
      options: [
        {
          name: '--page-number',
          description: 'Page number (default: 1)',
          required: false,
          type: 'integer',
          default: 1,
          minimum: 1,
        },
        {
          name: '--page-size',
          description: 'Page size (default: 100, max: 1000)',
          required: false,
          type: 'integer',
          default: 100,
          minimum: 1,
          maximum: 1000,
        },
        {
          name: '--min-total-costs',
          description: 'Minimum total costs threshold (ms)',
          required: false,
          type: 'number',
        },
      ],
      handler: (opts) =>
        getDirectories(
          opts['page-number'] as string,
          opts['page-size'] as string,
          opts['min-total-costs'] as string,
        ),
    },
  },

  build: {
    summary: {
      description: 'Get build summary with costs (build time analysis).',
      options: [],
      handler: () => getSummary(),
    },
    entrypoints: {
      description: 'List all entrypoints in the bundle.',
      options: [],
      handler: () => listEntrypoints(),
    },
    config: {
      description: 'Get build configuration (rspack/webpack config).',
      options: [],
      handler: () => getConfig(),
    },
    optimize: {
      description:
        'Combined bundle optimization inputs: duplicate packages, similar packages, media assets, large chunks, and side effects modules. Supports step-by-step execution.',
      options: [
        {
          name: '--step',
          description:
            'Execution step: 1 (basic analysis) or 2 (side effects). If not specified, executes both.',
          required: false,
          type: 'integer',
          enum: [1, 2],
        },
        {
          name: '--side-effects-page-number',
          description:
            'Page number for side effects (default: 1, only used in step 2)',
          required: false,
          type: 'integer',
          default: 1,
          minimum: 1,
        },
        {
          name: '--side-effects-page-size',
          description:
            'Page size for side effects (default: 100, max: 1000, only used in step 2)',
          required: false,
          type: 'integer',
          default: 100,
          minimum: 1,
          maximum: 1000,
        },
      ],
      handler: (opts) =>
        optimizeBundle(
          opts['step'] as string,
          opts['side-effects-page-number'] as string,
          opts['side-effects-page-size'] as string,
        ),
    },
  },

  bundle: {
    optimize: {
      description:
        'Combined bundle optimization inputs (alias for build optimize).',
      options: [
        {
          name: '--step',
          description:
            'Execution step: 1 (basic analysis) or 2 (side effects). If not specified, executes both.',
          required: false,
          type: 'integer',
          enum: [1, 2],
        },
        {
          name: '--side-effects-page-number',
          description:
            'Page number for side effects (default: 1, only used in step 2)',
          required: false,
          type: 'integer',
          default: 1,
          minimum: 1,
        },
        {
          name: '--side-effects-page-size',
          description:
            'Page size for side effects (default: 100, max: 1000, only used in step 2)',
          required: false,
          type: 'integer',
          default: 100,
          minimum: 1,
          maximum: 1000,
        },
      ],
      handler: (opts) =>
        optimizeBundle(
          opts['step'] as string,
          opts['side-effects-page-number'] as string,
          opts['side-effects-page-size'] as string,
        ),
    },
  },

  errors: {
    list: {
      description: 'Get all errors and warnings from the build.',
      options: [],
      handler: () => listErrors(),
    },
    'by-code': {
      description: 'Get errors filtered by error code (e.g., E1001, E1004).',
      options: [
        {
          name: '--code',
          description: 'Error code',
          required: true,
          type: 'string',
        },
      ],
      handler: (opts) => getErrorsByCode(opts['code'] as string),
    },
    'by-level': {
      description: 'Get errors filtered by level (error, warn, info).',
      options: [
        {
          name: '--level',
          description: 'Error level',
          required: true,
          type: 'string',
          enum: ['error', 'warn', 'info'],
        },
      ],
      handler: (opts) => getErrorsByLevel(opts['level'] as string),
    },
  },

  rules: {
    list: {
      description: 'Get rule scan results (overlay alerts).',
      options: [],
      handler: () => listRules(),
    },
  },

  server: {
    port: {
      description: 'Get the JSON data file path used by the CLI.',
      options: [],
      handler: () => getPort(),
    },
  },

  'tree-shaking': {
    'side-effects-only': {
      description:
        'Detect modules pulled in solely for side effects (E1007). Indicates tree-shaking failures from missing/incorrect "sideEffects" in package.json.',
      options: [],
      handler: () => detectSideEffectsOnlyImports(),
    },
    'cjs-require': {
      description:
        'Detect bare `require()` calls that prevent tree-shaking (E1008). Fix by using destructured require or ESM imports.',
      options: [],
      handler: () => detectCjsRequire(),
    },
    'esm-to-cjs': {
      description:
        'Detect ESM imports resolved to CJS despite an ESM entry being available (E1009).',
      options: [],
      handler: () => detectEsmResolvedToCjs(),
    },
    summary: {
      description:
        'Comprehensive tree-shaking health summary: all rule violations (E1007/E1008/E1009) plus per-module bailout reasons.',
      options: [],
      handler: () => getTreeShakingSummary(),
    },
    'bailout-reasons': {
      description:
        'List modules that cannot be tree-shaken grouped by bailout reason (side effects / dynamic import / unknown exports).',
      options: [
        {
          name: '--page-number',
          description: 'Page number (default: 1)',
          required: false,
          type: 'integer',
          default: 1,
          minimum: 1,
        },
        {
          name: '--page-size',
          description: 'Page size (default: 100, max: 1000)',
          required: false,
          type: 'integer',
          default: 100,
          minimum: 1,
          maximum: 1000,
        },
      ],
      handler: (opts) =>
        getBailoutModules(
          opts['page-number'] as string,
          opts['page-size'] as string,
        ),
    },
    'exports-analysis': {
      description:
        'Analyze module exports to identify unused exports and barrel-file anti-patterns that hurt tree-shaking.',
      options: [],
      handler: () => getExportsAnalysis(),
    },
  },
};

// --- Schema introspection ---

function optionToJsonSchema(opt: OptionDef): Record<string, unknown> {
  const prop: Record<string, unknown> = {
    type: opt.type || 'string',
    description: opt.description,
  };
  if (opt.default !== undefined) prop.default = opt.default;
  if (opt.enum) prop.enum = opt.enum;
  if (opt.minimum !== undefined) prop.minimum = opt.minimum;
  if (opt.maximum !== undefined) prop.maximum = opt.maximum;
  return prop;
}

function buildInputSchema(options: OptionDef[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const opt of options) {
    const name = opt.name.replace(/^--/, '');
    properties[name] = optionToJsonSchema(opt);
    if (opt.required) required.push(name);
  }

  const schema: Record<string, unknown> = {
    type: 'object',
    properties,
    additionalProperties: false,
  };
  if (required.length > 0) schema.required = required;
  return schema;
}

export function describeCommandSchema(commandPath: string): unknown {
  const [group, subcommand] = commandPath.split('.');
  if (!group || !subcommand) {
    return {
      ok: false,
      error: `Invalid command path: "${commandPath}". Use <group>.<subcommand> format.`,
      available: Object.keys(SUBCOMMANDS),
    };
  }
  const groupDef = SUBCOMMANDS[group];
  if (!groupDef) {
    return {
      ok: false,
      error: `Unknown group: "${group}".`,
      available: Object.keys(SUBCOMMANDS),
    };
  }
  const cmdDef = groupDef[subcommand];
  if (!cmdDef) {
    return {
      ok: false,
      error: `Unknown subcommand: "${group}.${subcommand}".`,
      available: Object.keys(groupDef).map((s) => `${group}.${s}`),
    };
  }
  return {
    command: `${group}.${subcommand}`,
    description: cmdDef.description,
    inputSchema: buildInputSchema(cmdDef.options),
  };
}

// --- Describe (listing) ---

export function describeCommands(): unknown {
  const result: Record<string, Record<string, unknown>> = {};
  for (const [group, subcommands] of Object.entries(SUBCOMMANDS)) {
    result[group] = {};
    for (const [name, def] of Object.entries(subcommands)) {
      result[group][name] = {
        description: def.description,
        inputSchema: buildInputSchema(def.options),
      };
    }
  }
  return result;
}

// --- Router ---

export async function route(
  args: string[],
  options: {
    dataFile?: string;
    compact?: boolean;
    describe?: boolean;
    schema?: string;
    argv?: string[];
    write?: (text: string) => void;
  },
): Promise<number> {
  const spacing = options.compact ? 0 : 2;
  const write = options.write ?? ((text: string) => console.log(text));

  if (options.schema) {
    write(JSON.stringify(describeCommandSchema(options.schema), null, spacing));
    return 0;
  }

  if (options.describe) {
    write(JSON.stringify(describeCommands(), null, spacing));
    return 0;
  }

  if (!options.dataFile) {
    throw new Error('Missing required option: --data-file <path>');
  }
  setDataFilePath(options.dataFile);

  const execute = createExecutor(!!options.compact, { write });

  const [group, subcommand] = args;
  if (!group || !subcommand) {
    throw new Error(
      'Usage: rsdoctor ai <group> <subcommand> [options]\n' +
        'Use --describe to see all available commands.\n' +
        'Use --schema <group>.<subcommand> to inspect a command.',
    );
  }

  const groupDef = SUBCOMMANDS[group];
  if (!groupDef) {
    throw new Error(
      `Unknown command group: ${group}. Use --describe to see available groups.`,
    );
  }

  const cmdDef = groupDef[subcommand];
  if (!cmdDef) {
    throw new Error(
      `Unknown subcommand: ${group} ${subcommand}. Use --describe to see available subcommands.`,
    );
  }

  const rawOpts = parseSubcommandOptions(options.argv ?? process.argv);
  try {
    await execute(() => cmdDef.handler(rawOpts));
    return 0;
  } catch {
    return 1;
  }
}
