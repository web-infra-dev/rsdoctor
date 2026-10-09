import type { Manifest, Rule } from '@rsdoctor/shared/types';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_CHAIN_DEPTH = 5;
const MAX_CHAIN_DEPTH = 10;
const MAX_TEXT_LENGTH = 500;

type AssetType = 'js' | 'css' | 'other';
type Severity = 'error' | 'warn';
type ToolInput = Record<string, unknown>;

type ModelContextTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: {
    readOnlyHint: true;
    untrustedContentHint: true;
  };
  execute(input: unknown): Promise<unknown>;
};

type ModelContext = {
  registerTool(
    tool: ModelContextTool,
    options?: { signal?: AbortSignal },
  ): Promise<unknown>;
};

type WebMCPDocument = Document & {
  modelContext?: ModelContext;
};

type BuildOverview = {
  buildName?: string;
  hash?: string;
  assets: { count: number; totalBytes: number };
  modules: { count: number };
  packages: { count: number };
  findings: Record<Severity, number>;
  buildDurationMs: number;
};

type AssetSummary = {
  path: string;
  size: number;
  type: AssetType;
  chunks: string[];
};

type ModuleReference = {
  id: number;
  path: string;
  identifier: string;
};

type ModuleDependencyChain = {
  module: ModuleReference;
  chain: ModuleReference[];
  truncated: boolean;
};

type EntryPointSummary = {
  id: number;
  name: string;
  chunks: string[];
  assets: string[];
  size: number;
};

type PackageSummary = {
  id: number;
  name: string;
  version: string;
  root: string;
  parsedSize: number;
  moduleCount: number;
};

type SharedModuleSummary = ModuleReference & {
  chunks: string[];
  parsedSize: number;
};

type CompressedAssetSummary = AssetSummary & {
  compressedSize: number;
  savingsBytes: number;
  compression: 'gzip' | 'brotli';
};

type BuildTimingStage = {
  name: string;
  startAt: number;
  durationMs: number;
  percentOfTotal: number;
};

type RuleFinding = {
  id: number | string;
  code: string;
  category: string;
  title: string;
  description?: string;
  severity: Severity;
  link?: string;
};

function isRecord(value: unknown): value is ToolInput {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getLimit(value: unknown): number {
  if (!Number.isInteger(value)) return DEFAULT_LIMIT;
  return Math.min(Math.max(value as number, 1), MAX_LIMIT);
}

function getChainDepth(value: unknown): number {
  if (!Number.isInteger(value)) return DEFAULT_CHAIN_DEPTH;
  return Math.min(Math.max(value as number, 1), MAX_CHAIN_DEPTH);
}

function getAssetType(path: string): AssetType {
  if (/\.(?:[cm]?js|jsx|tsx?)$/i.test(path)) return 'js';
  if (/\.css$/i.test(path)) return 'css';
  return 'other';
}

function truncate(value: string | undefined): string | undefined {
  if (!value || value.length <= MAX_TEXT_LENGTH) return value;
  return `${value.slice(0, MAX_TEXT_LENGTH - 1)}…`;
}

export function getBuildOverview(
  manifest: Manifest.RsdoctorManifest,
): BuildOverview {
  const data = manifest.data;
  const assets = data.chunkGraph?.assets ?? [];
  const findings = data.errors ?? [];

  return {
    buildName: manifest.name,
    hash: data.hash,
    assets: {
      count: assets.length,
      totalBytes: assets.reduce((total, asset) => total + asset.size, 0),
    },
    modules: { count: data.moduleGraph?.modules?.length ?? 0 },
    packages: { count: data.packageGraph?.packages?.length ?? 0 },
    findings: {
      error: findings.filter((finding) => finding.level === 'error').length,
      warn: findings.filter((finding) => finding.level === 'warn').length,
    },
    buildDurationMs: (data.summary?.costs ?? []).reduce(
      (total, cost) => total + cost.costs,
      0,
    ),
  };
}

export function findLargeAssets(
  manifest: Manifest.RsdoctorManifest,
  input: unknown,
): { total: number; items: AssetSummary[]; truncated: boolean } {
  const args = isRecord(input) ? input : {};
  const minSize =
    typeof args.minSize === 'number' && args.minSize >= 0 ? args.minSize : 0;
  const assetType: AssetType | undefined =
    args.assetType === 'js' ||
    args.assetType === 'css' ||
    args.assetType === 'other'
      ? args.assetType
      : undefined;
  const limit = getLimit(args.limit);

  const items = (manifest.data.chunkGraph?.assets ?? [])
    .map((asset) => ({
      path: asset.path,
      size: asset.size,
      type: getAssetType(asset.path),
      chunks: asset.chunks.slice(0, 20),
    }))
    .filter(
      (asset) =>
        asset.size >= minSize && (!assetType || asset.type === assetType),
    )
    .sort((left, right) => right.size - left.size);

  return {
    total: items.length,
    items: items.slice(0, limit),
    truncated: items.length > limit,
  };
}

export function findCompressibleAssets(
  manifest: Manifest.RsdoctorManifest,
  input: unknown,
): { total: number; items: CompressedAssetSummary[]; truncated: boolean } {
  const args = isRecord(input) ? input : {};
  const compression = args.compression === 'brotli' ? 'brotli' : 'gzip';
  const minSize =
    typeof args.minSize === 'number' && args.minSize >= 0 ? args.minSize : 0;
  const limit = getLimit(args.limit);
  const items = (manifest.data.chunkGraph?.assets ?? [])
    .map((asset) => ({
      compressedSize:
        compression === 'brotli' ? asset.brotliSize : asset.gzipSize,
      path: asset.path,
      size: asset.size,
      type: getAssetType(asset.path),
      chunks: asset.chunks.slice(0, 20),
    }))
    .filter(
      (
        asset,
      ): asset is Omit<
        CompressedAssetSummary,
        'savingsBytes' | 'compression'
      > => typeof asset.compressedSize === 'number' && asset.size >= minSize,
    )
    .map((asset): CompressedAssetSummary => ({
      ...asset,
      savingsBytes: Math.max(0, asset.size - asset.compressedSize),
      compression,
    }))
    .sort((left, right) => right.savingsBytes - left.savingsBytes);

  return {
    total: items.length,
    items: items.slice(0, limit),
    truncated: items.length > limit,
  };
}

export function getBuildTimingBreakdown(
  manifest: Manifest.RsdoctorManifest,
  input: unknown,
): {
  totalDurationMs: number;
  total: number;
  items: BuildTimingStage[];
  truncated: boolean;
} {
  const args = isRecord(input) ? input : {};
  const minDuration =
    typeof args.minDuration === 'number' && args.minDuration >= 0
      ? args.minDuration
      : 0;
  const limit = getLimit(args.limit);
  const costs = manifest.data.summary?.costs ?? [];
  const totalDurationMs = costs.reduce((total, cost) => total + cost.costs, 0);
  const items = costs
    .filter((cost) => cost.costs >= minDuration)
    .map((cost) => ({
      name: cost.name,
      startAt: cost.startAt,
      durationMs: cost.costs,
      percentOfTotal:
        totalDurationMs === 0 ? 0 : (cost.costs / totalDurationMs) * 100,
    }))
    .sort((left, right) => right.durationMs - left.durationMs);

  return {
    totalDurationMs,
    total: items.length,
    items: items.slice(0, limit),
    truncated: items.length > limit,
  };
}

export function getEntrypoints(
  manifest: Manifest.RsdoctorManifest,
  input: unknown,
): { total: number; items: EntryPointSummary[]; truncated: boolean } {
  const args = isRecord(input) ? input : {};
  const limit = getLimit(args.limit);
  const items = (manifest.data.chunkGraph?.entrypoints ?? [])
    .map((entrypoint) => ({
      id: entrypoint.id,
      name: entrypoint.name,
      chunks: entrypoint.chunks.slice(0, 20),
      assets: entrypoint.assets.slice(0, 20),
      size: entrypoint.size,
    }))
    .sort((left, right) => right.size - left.size);

  return {
    total: items.length,
    items: items.slice(0, limit),
    truncated: items.length > limit,
  };
}

export function findLargePackages(
  manifest: Manifest.RsdoctorManifest,
  input: unknown,
): { total: number; items: PackageSummary[]; truncated: boolean } {
  const args = isRecord(input) ? input : {};
  const query = typeof args.query === 'string' ? args.query.toLowerCase() : '';
  const minSize =
    typeof args.minSize === 'number' && args.minSize >= 0 ? args.minSize : 0;
  const limit = getLimit(args.limit);
  const items = (manifest.data.packageGraph?.packages ?? [])
    .filter((pkg) => pkg.size.parsedSize >= minSize)
    .filter((pkg) => !query || pkg.name.toLowerCase().includes(query))
    .map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      version: pkg.version,
      root: pkg.root,
      parsedSize: pkg.size.parsedSize,
      moduleCount: pkg.modules?.length ?? 0,
    }))
    .sort((left, right) => right.parsedSize - left.parsedSize);

  return {
    total: items.length,
    items: items.slice(0, limit),
    truncated: items.length > limit,
  };
}

export function findSharedModules(
  manifest: Manifest.RsdoctorManifest,
  input: unknown,
): { total: number; items: SharedModuleSummary[]; truncated: boolean } {
  const args = isRecord(input) ? input : {};
  const minChunks =
    typeof args.minChunks === 'number' && args.minChunks >= 2
      ? Math.floor(args.minChunks)
      : 2;
  const minSize =
    typeof args.minSize === 'number' && args.minSize >= 0 ? args.minSize : 0;
  const limit = getLimit(args.limit);
  const items = (manifest.data.moduleGraph?.modules ?? [])
    .filter(
      (module) =>
        module.chunks.length >= minChunks && module.size.parsedSize >= minSize,
    )
    .map((module) => ({
      id: module.id,
      path: module.path,
      identifier: module.identifier,
      chunks: module.chunks.slice(0, 20),
      parsedSize: module.size.parsedSize,
    }))
    .sort((left, right) => right.parsedSize - left.parsedSize);

  return {
    total: items.length,
    items: items.slice(0, limit),
    truncated: items.length > limit,
  };
}

export function getChunkModuleDependencyChains(
  manifest: Manifest.RsdoctorManifest,
  input: unknown,
): { total: number; items: ModuleDependencyChain[]; truncated: boolean } {
  const args = isRecord(input) ? input : {};
  const chunkId = typeof args.chunkId === 'string' ? args.chunkId : '';
  const moduleId =
    typeof args.moduleId === 'number' ? args.moduleId : undefined;
  const limit = getLimit(args.limit);
  const maxDepth = getChainDepth(args.maxDepth);
  const graph = manifest.data.moduleGraph;
  const chunk = manifest.data.chunkGraph?.chunks.find(
    (item) => item.id === chunkId,
  );
  if (!graph || !chunk) return { total: 0, items: [], truncated: false };

  const modules = new Map(graph.modules.map((module) => [module.id, module]));
  const dependencies = new Map(
    graph.dependencies.map((dependency) => [dependency.id, dependency]),
  );
  const roots = chunk.modules
    .filter((id) => moduleId === undefined || id === moduleId)
    .map((id) => modules.get(id))
    .filter((module): module is NonNullable<typeof module> => Boolean(module));
  const items: ModuleDependencyChain[] = [];
  let total = 0;

  const toReference = (
    module: (typeof graph.modules)[number],
  ): ModuleReference => ({
    id: module.id,
    path: module.path,
    identifier: module.identifier,
  });
  const visit = (
    root: (typeof graph.modules)[number],
    current: (typeof graph.modules)[number],
    chain: ModuleReference[],
    seen: Set<number>,
  ) => {
    const next = current.dependencies
      .map((id) => dependencies.get(id))
      .map((dependency) => dependency && modules.get(dependency.dependency))
      .filter((module): module is NonNullable<typeof module> =>
        Boolean(module),
      );
    const reachedDepth = chain.length - 1 >= maxDepth;
    const nextModules = next.filter((module) => !seen.has(module.id));

    if (reachedDepth || nextModules.length === 0) {
      total += 1;
      if (items.length < limit) {
        items.push({
          module: toReference(root),
          chain,
          truncated: reachedDepth && next.length > 0,
        });
      }
      return;
    }

    for (const module of nextModules) {
      visit(
        root,
        module,
        [...chain, toReference(module)],
        new Set([...seen, module.id]),
      );
    }
  };

  for (const root of roots) {
    visit(root, root, [toReference(root)], new Set([root.id]));
  }

  return {
    total,
    items,
    truncated: total > limit,
  };
}

export function getRuleFindings(
  manifest: Manifest.RsdoctorManifest,
  input: unknown,
): { total: number; items: RuleFinding[]; truncated: boolean } {
  const args = isRecord(input) ? input : {};
  const severity: Severity | undefined =
    args.severity === 'error' || args.severity === 'warn'
      ? args.severity
      : undefined;
  const ruleId = typeof args.ruleId === 'string' ? args.ruleId : undefined;
  const limit = getLimit(args.limit);

  const items = (manifest.data.errors ?? [])
    .filter((finding) => !severity || finding.level === severity)
    .filter((finding) => !ruleId || finding.code === ruleId)
    .map((finding) => toRuleFinding(finding));

  return {
    total: items.length,
    items: items.slice(0, limit),
    truncated: items.length > limit,
  };
}

function toRuleFinding(finding: Rule.RuleStoreDataItem): RuleFinding {
  return {
    id: finding.id,
    code: finding.code,
    category: finding.category,
    title: truncate(finding.title) ?? '',
    description: truncate(finding.description),
    severity: finding.level,
    link: finding.link,
  };
}

export function isWebMCPAvailable(): boolean {
  return typeof document !== 'undefined' && Boolean(getModelContext());
}

function getModelContext(): ModelContext | undefined {
  const modelContext = (document as WebMCPDocument).modelContext;
  return typeof modelContext?.registerTool === 'function'
    ? modelContext
    : undefined;
}

export async function registerReportTools(
  manifest: Manifest.RsdoctorManifest,
  signal: AbortSignal,
): Promise<void> {
  const modelContext = getModelContext();
  if (!modelContext) return;

  const options = { signal };
  await Promise.all([
    modelContext.registerTool(
      createTool(
        'get_build_overview',
        'Get a compact overview of the current Rsdoctor report.',
        {},
        () => getBuildOverview(manifest),
      ),
      options,
    ),
    modelContext.registerTool(
      createTool(
        'find_large_assets',
        'Find the largest JavaScript, CSS, or other assets in the current Rsdoctor report.',
        {
          minSize: { type: 'integer', minimum: 0 },
          assetType: { type: 'string', enum: ['js', 'css', 'other'] },
          limit: { type: 'integer', minimum: 1, maximum: MAX_LIMIT },
        },
        (input) => findLargeAssets(manifest, input),
      ),
      options,
    ),
    modelContext.registerTool(
      createTool(
        'find_compressible_assets',
        'Find assets with the largest gzip or Brotli size savings.',
        {
          compression: { type: 'string', enum: ['gzip', 'brotli'] },
          minSize: { type: 'integer', minimum: 0 },
          limit: { type: 'integer', minimum: 1, maximum: MAX_LIMIT },
        },
        (input) => findCompressibleAssets(manifest, input),
      ),
      options,
    ),
    modelContext.registerTool(
      createTool(
        'get_build_timing_breakdown',
        'Get build stages ranked by duration, including their share of total build time.',
        {
          minDuration: { type: 'number', minimum: 0 },
          limit: { type: 'integer', minimum: 1, maximum: MAX_LIMIT },
        },
        (input) => getBuildTimingBreakdown(manifest, input),
      ),
      options,
    ),
    modelContext.registerTool(
      createTool(
        'get_entrypoints',
        'List report entrypoints with their chunks, assets, and sizes.',
        {
          limit: { type: 'integer', minimum: 1, maximum: MAX_LIMIT },
        },
        (input) => getEntrypoints(manifest, input),
      ),
      options,
    ),
    modelContext.registerTool(
      createTool(
        'find_large_packages',
        'Find the largest packages in the current Rsdoctor report.',
        {
          query: { type: 'string' },
          minSize: { type: 'integer', minimum: 0 },
          limit: { type: 'integer', minimum: 1, maximum: MAX_LIMIT },
        },
        (input) => findLargePackages(manifest, input),
      ),
      options,
    ),
    modelContext.registerTool(
      createTool(
        'find_shared_modules',
        'Find modules shared across chunks, ordered by parsed size.',
        {
          minChunks: { type: 'integer', minimum: 2 },
          minSize: { type: 'integer', minimum: 0 },
          limit: { type: 'integer', minimum: 1, maximum: MAX_LIMIT },
        },
        (input) => findSharedModules(manifest, input),
      ),
      options,
    ),
    modelContext.registerTool(
      createTool(
        'get_chunk_module_dependency_chains',
        'Trace each selected module in a chunk toward its direct and transitive dependencies.',
        {
          chunkId: { type: 'string' },
          moduleId: { type: 'integer' },
          maxDepth: { type: 'integer', minimum: 1, maximum: MAX_CHAIN_DEPTH },
          limit: { type: 'integer', minimum: 1, maximum: MAX_LIMIT },
        },
        (input) => getChunkModuleDependencyChains(manifest, input),
        ['chunkId'],
      ),
      options,
    ),
    modelContext.registerTool(
      createTool(
        'get_rule_findings',
        'Get filtered rule findings from the current Rsdoctor report.',
        {
          ruleId: { type: 'string' },
          severity: { type: 'string', enum: ['error', 'warn'] },
          limit: { type: 'integer', minimum: 1, maximum: MAX_LIMIT },
        },
        (input) => getRuleFindings(manifest, input),
      ),
      options,
    ),
  ]);
}

function createTool(
  name: string,
  description: string,
  properties: Record<string, unknown>,
  execute: (input: unknown) => unknown,
  required: string[] = [],
): ModelContextTool {
  return {
    name,
    description,
    inputSchema: {
      type: 'object',
      properties,
      ...(required.length > 0 ? { required } : {}),
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: true,
    },
    execute: async (input) => execute(input),
  };
}

export type {
  AssetSummary,
  BuildOverview,
  BuildTimingStage,
  CompressedAssetSummary,
  EntryPointSummary,
  ModuleDependencyChain,
  ModuleReference,
  PackageSummary,
  RuleFinding,
  SharedModuleSummary,
};
