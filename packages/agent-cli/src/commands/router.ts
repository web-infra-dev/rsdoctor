import { setDataFilePath } from './datasource';
import { createExecutor } from './utils';
import { parseSubcommandOptions } from './utils';

import { findLargeChunks, getChunkById, listChunks } from './handlers/chunks';
import {
  getModuleById,
  getModuleByPath,
  getModuleExports,
  getModuleIssuerPath,
  getSideEffectsHandler as getSideEffects,
} from './handlers/modules';
import {
  detectDuplicatePackages,
  detectSimilarPackages,
  getPackageByName,
  getPackageDependencies,
  listDirectDependencyPackages,
  listPackages,
} from './handlers/packages';
import { diffAssets, getMediaAssets, listAssets } from './handlers/assets';
import { getDirectories, getHotFiles } from './handlers/loaders';
import {
  getConfig,
  getDataFileInfo,
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
import {
  getBailoutModules,
  getExportsAnalysis,
  getRetainedModulesHandler,
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
  toolName?: string;
  toolDescription?: string;
}

const optimizeStepOptions: OptionDef[] = [
  {
    name: '--step',
    description:
      'Execution step: 1 (basic analysis) or 2 (tree-shaking summary). If not specified, executes both.',
    required: false,
    type: 'integer',
    enum: [1, 2],
  },
];

const pageNumberOption: OptionDef = {
  name: '--page-number',
  description: 'Page number (default: 1)',
  required: false,
  type: 'integer',
  default: 1,
  minimum: 1,
};

const pageSizeOption1000: OptionDef = {
  name: '--page-size',
  description: 'Page size (default: 100, max: 1000)',
  required: false,
  type: 'integer',
  default: 100,
  minimum: 1,
  maximum: 1000,
};

const pageSizeOption100: OptionDef = {
  name: '--page-size',
  description: 'Page size (default: 100, max: 100)',
  required: false,
  type: 'integer',
  default: 100,
  minimum: 1,
  maximum: 100,
};

const pageOptions1000: OptionDef[] = [pageNumberOption, pageSizeOption1000];
const pageOptions100: OptionDef[] = [pageNumberOption, pageSizeOption100];

const sideEffectsCategoryOption: OptionDef = {
  name: '--category',
  description:
    'Filter bailout modules by cause: cjs, barrel, side-effects, or dynamic-import.',
  required: false,
  type: 'string',
  enum: ['cjs', 'barrel', 'side-effects', 'dynamic-import'],
};

function createOptimizeCommand(
  command: Pick<SubcommandDef, 'description' | 'toolName' | 'toolDescription'>,
): SubcommandDef {
  return {
    ...command,
    options: optimizeStepOptions,
    handler: (opts) => optimizeBundle(opts['step'] as string),
  };
}

const SUBCOMMANDS: Record<string, Record<string, SubcommandDef>> = {
  chunks: {
    list: {
      description: 'List all chunks (id, name, size, modules).',
      toolName: 'chunks_list',
      toolDescription:
        'List chunks with ids, names, sizes, and module counts for bundle composition analysis.',
      options: pageOptions1000,
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
      options: [...pageOptions1000, sideEffectsCategoryOption],
      handler: (opts) =>
        getSideEffects(
          opts['page-number'] as string,
          opts['page-size'] as string,
          opts.category as string,
        ),
    },
  },

  packages: {
    list: {
      description: 'List packages with size/duplication info.',
      options: pageOptions1000,
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
      options: pageOptions100,
      handler: (opts) =>
        getPackageDependencies(
          opts['page-number'] as string,
          opts['page-size'] as string,
        ),
    },
    'direct-dependencies': {
      description:
        'List third-party packages directly imported by project/local packages.',
      toolName: 'packages_direct_dependencies',
      toolDescription:
        'List direct third-party package dependencies from project/local packages, excluding transitive third-party-to-third-party dependencies.',
      options: [],
      handler: () => listDirectDependencyPackages(),
    },
    duplicates: {
      description:
        'Detect duplicate packages using E1001 overlay rule if present.',
      toolName: 'packages_duplicates',
      toolDescription:
        'Detect duplicate packages from the current Rsdoctor analysis.',
      options: [],
      handler: () => detectDuplicatePackages(),
    },
    similar: {
      description: 'Detect similar packages (lodash/lodash-es etc.).',
      toolName: 'packages_similar',
      toolDescription:
        'Detect similar package families from the current Rsdoctor analysis.',
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
        ...pageOptions1000,
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
        ...pageOptions1000,
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
      toolName: 'build_summary',
      toolDescription:
        'Get build summary with costs and overall build information.',
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
    optimize: createOptimizeCommand({
      description:
        'Combined bundle optimization inputs: duplicate packages, similar packages, media assets, large chunks, and tree-shaking summary. Supports step-by-step execution.',
    }),
  },

  bundle: {
    optimize: createOptimizeCommand({
      description:
        'Combined bundle optimization inputs (alias for build optimize).',
      toolName: 'bundle_optimize',
      toolDescription:
        'Get bundle optimization inputs including duplicate packages, similar packages, large chunks, and tree-shaking summary signals.',
    }),
  },

  errors: {
    list: {
      description: 'Get all errors and warnings from the build.',
      toolName: 'errors_list',
      toolDescription:
        'Get all build errors and warnings from the current Rsdoctor analysis.',
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
      handler: () => getDataFileInfo(),
    },
  },

  'tree-shaking': {
    summary: {
      description:
        'Comprehensive tree-shaking health summary: all rule violations (E1007/E1008/E1009).',
      toolName: 'tree_shaking_summary',
      toolDescription:
        'Get a tree-shaking health summary including E1007, E1008, and E1009.',
      options: [],
      handler: () => getTreeShakingSummary(),
    },
    'bailout-reasons': {
      description:
        'List modules that cannot be tree-shaken grouped by bailout reason (side effects / dynamic import / unknown exports).',
      options: [
        {
          name: '--modules',
          description:
            'Comma-separated module ids, paths, or names to query. Defaults to all bailout modules.',
          required: false,
          type: 'string',
        },
        ...pageOptions1000,
      ],
      handler: (opts) =>
        getBailoutModules(
          opts['page-number'] as string,
          opts['page-size'] as string,
          opts.modules as string,
        ),
    },
    'side-effects': {
      description:
        'List modules that cannot be tree-shaken based on bailoutReason, optionally filtered by category.',
      toolName: 'tree_shaking_side_effects',
      toolDescription:
        'List modules that cannot be tree-shaken based on bailoutReason, optionally filtered by category.',
      options: [sideEffectsCategoryOption, ...pageOptions1000],
      handler: (opts) =>
        getSideEffects(
          opts['page-number'] as string,
          opts['page-size'] as string,
          opts.category as string,
        ),
    },
    'retained-modules': {
      description:
        'List retained modules that were not tree-shaken, with package metadata, normalized category, emitted chunks, and recommendations.',
      toolName: 'tree_shaking_retained_modules',
      toolDescription:
        'List retained modules that were not tree-shaken, with package metadata, normalized category, emitted chunks, and recommendations.',
      options: [
        {
          name: '--emitted-only',
          description: 'Only include modules attached to emitted assets.',
          required: false,
          type: 'boolean',
        },
        {
          name: '--category',
          description:
            'Comma-separated retained categories: cjs, barrel, side-effects, dynamic-import, unknown.',
          required: false,
          type: 'string',
        },
        {
          name: '--sort',
          description: 'Sort by sourceSize, parsedSize, or gzipSize.',
          required: false,
          type: 'string',
          enum: ['sourceSize', 'parsedSize', 'gzipSize'],
          default: 'parsedSize',
        },
        {
          name: '--limit',
          description: 'Maximum rows to return (default: 100, max: 1000).',
          required: false,
          type: 'integer',
          default: 100,
          minimum: 1,
          maximum: 1000,
        },
        {
          name: '--filter',
          description:
            'Comma-separated row fields to keep, e.g. id,path,size,chunks,bailoutReason.',
          required: false,
          type: 'string',
        },
      ],
      handler: (opts) =>
        getRetainedModulesHandler(
          opts['emitted-only'] as string | true,
          opts.category as string,
          opts.sort as string,
          opts.limit as string,
          opts.filter as string,
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

// --- Tool catalog (derived from SUBCOMMANDS) ---

interface ToolCatalogEntry {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    additionalProperties: boolean;
  };
  buildCommand: (context: {
    dataFile: string;
    input: Record<string, unknown>;
  }) => string[];
}

interface InProcessToolEntry {
  execute: (context: {
    dataFile: string;
    input: Record<string, unknown>;
  }) => Promise<unknown>;
}

function appendToolSpecificOptions(
  command: string[],
  options: OptionDef[],
  input: Record<string, unknown>,
): string[] {
  const nextCommand = [...command];
  for (const option of options) {
    const name = option.name.replace(/^--/, '');
    const value = input[name];
    if (value === undefined) {
      continue;
    }
    nextCommand.push(option.name);
    if (value !== true) {
      nextCommand.push(Array.isArray(value) ? value.join(',') : String(value));
    }
  }
  return nextCommand;
}

const toolInputSchema = {
  type: 'object' as const,
  properties: {
    filter: {
      type: ['string', 'array'],
      description:
        'Optional field filter. Supports comma-separated paths like "items.id,items.name".',
    },
    page: {
      type: 'integer',
      minimum: 1,
      description: 'Optional page number for response pagination.',
    },
    pageSize: {
      type: 'integer',
      minimum: 1,
      maximum: 1000,
      description: 'Optional page size for response pagination.',
    },
  } as Record<string, unknown>,
  additionalProperties: true,
};

export function getToolCatalog(): ToolCatalogEntry[] {
  const tools: ToolCatalogEntry[] = [];
  for (const [group, subcommands] of Object.entries(SUBCOMMANDS)) {
    for (const [subcommand, def] of Object.entries(subcommands)) {
      if (!def.toolName) continue;
      tools.push({
        name: def.toolName,
        description: def.toolDescription ?? def.description,
        inputSchema: toolInputSchema,
        buildCommand: ({ dataFile, input }) =>
          appendToolSpecificOptions(
            [
              'rsdoctor-agent',
              group,
              subcommand,
              '--data-file',
              dataFile,
              '--compact',
            ],
            def.options,
            input,
          ),
      });
    }
  }
  return tools;
}

export function describeRunSubcommands(): Array<{
  toolName: string;
  path: string;
  description: string;
  args: Record<string, unknown>;
}> {
  const result: Array<{
    toolName: string;
    path: string;
    description: string;
    args: Record<string, unknown>;
  }> = [];

  for (const [group, subcommands] of Object.entries(SUBCOMMANDS)) {
    for (const [subcommand, def] of Object.entries(subcommands)) {
      if (!def.toolName) {
        continue;
      }
      result.push({
        toolName: def.toolName,
        path: `${group}.${subcommand}`,
        description: def.toolDescription ?? def.description,
        args: toolInputSchema as Record<string, unknown>,
      });
    }
  }

  return result;
}

export function getInProcessToolExecutors(): Record<
  string,
  InProcessToolEntry
> {
  const tools: Record<string, InProcessToolEntry> = {};
  for (const subcommands of Object.values(SUBCOMMANDS)) {
    for (const def of Object.values(subcommands)) {
      if (!def.toolName) continue;
      tools[def.toolName] = {
        execute: async ({ dataFile, input }) => {
          setDataFilePath(dataFile);
          return def.handler(input as Record<string, string | true>);
        },
      };
    }
  }
  return tools;
}

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

export function describeSubcommands(): Array<{
  name: string;
  path: string;
  description: string;
  args: Record<string, unknown>;
}> {
  const result: Array<{
    name: string;
    path: string;
    description: string;
    args: Record<string, unknown>;
  }> = [];

  for (const [group, subcommands] of Object.entries(SUBCOMMANDS)) {
    for (const [subcommand, def] of Object.entries(subcommands)) {
      result.push({
        name: `${group} ${subcommand}`,
        path: `${group}.${subcommand}`,
        description: def.description,
        args: buildInputSchema(def.options),
      });
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

  const [group, subcommand] = args;
  if (!group || !subcommand) {
    throw new Error(
      'Usage: rsdoctor-agent <group> <subcommand> [options]\n' +
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

  if (subcommand === '--help' || subcommand === '-h') {
    const groupCommands = Object.entries(groupDef).map(([name, def]) => ({
      command: `${group}.${name}`,
      description: def.description,
      inputSchema: buildInputSchema(def.options),
    }));
    write(JSON.stringify({ group, subcommands: groupCommands }, null, spacing));
    return 0;
  }

  const cmdDef = groupDef[subcommand];
  if (!cmdDef) {
    throw new Error(
      `Unknown subcommand: ${group} ${subcommand}. Use --describe to see available subcommands.`,
    );
  }

  const rawOpts = parseSubcommandOptions(options.argv ?? process.argv);
  if (rawOpts.help === true || rawOpts.h === true) {
    write(
      JSON.stringify(
        {
          command: `${group}.${subcommand}`,
          description: cmdDef.description,
          inputSchema: buildInputSchema(cmdDef.options),
        },
        null,
        spacing,
      ),
    );
    return 0;
  }

  if (!options.dataFile) {
    throw new Error('Missing required option: --data-file <path>');
  }
  setDataFilePath(options.dataFile);

  const execute = createExecutor(!!options.compact, { write });
  try {
    const success = await execute(() => cmdDef.handler(rawOpts));
    return success ? 0 : 1;
  } catch {
    return 1;
  }
}
