import type { ToolDefinition } from './types';

const emptyObjectSchema = {
  type: 'object',
  properties: {},
  additionalProperties: false,
} as const;

function withDataFile(
  group: string,
  subcommand: string,
  dataFile: string,
  extraArgs: string[] = [],
) {
  return [
    'rsdoctor-agent',
    group,
    subcommand,
    '--data-file',
    dataFile,
    '--compact',
    ...extraArgs,
  ];
}

export function createRsdoctorToolCatalog(): ToolDefinition[] {
  return [
    {
      name: 'build_summary',
      description:
        'Get build summary with costs and overall build information.',
      inputSchema: emptyObjectSchema,
      buildCommand: ({ dataFile }) =>
        withDataFile('build', 'summary', dataFile),
    },
    {
      name: 'bundle_optimize',
      description:
        'Get bundle optimization inputs including duplicate packages, similar packages, large chunks, and side effects signals.',
      inputSchema: emptyObjectSchema,
      buildCommand: ({ dataFile }) =>
        withDataFile('bundle', 'optimize', dataFile),
    },
    {
      name: 'chunks_list',
      description:
        'List chunks with ids, names, sizes, and module counts for bundle composition analysis.',
      inputSchema: emptyObjectSchema,
      buildCommand: ({ dataFile }) => withDataFile('chunks', 'list', dataFile),
    },
    {
      name: 'packages_duplicates',
      description:
        'Detect duplicate packages from the current Rsdoctor analysis.',
      inputSchema: emptyObjectSchema,
      buildCommand: ({ dataFile }) =>
        withDataFile('packages', 'duplicates', dataFile),
    },
    {
      name: 'packages_similar',
      description:
        'Detect similar package families from the current Rsdoctor analysis.',
      inputSchema: emptyObjectSchema,
      buildCommand: ({ dataFile }) =>
        withDataFile('packages', 'similar', dataFile),
    },
    {
      name: 'tree_shaking_summary',
      description:
        'Get a tree-shaking health summary including E1007, E1008, E1009, and bailout reasons.',
      inputSchema: emptyObjectSchema,
      buildCommand: ({ dataFile }) =>
        withDataFile('tree-shaking', 'summary', dataFile),
    },
    {
      name: 'errors_list',
      description:
        'Get all build errors and warnings from the current Rsdoctor analysis.',
      inputSchema: emptyObjectSchema,
      buildCommand: ({ dataFile }) => withDataFile('errors', 'list', dataFile),
    },
  ];
}
