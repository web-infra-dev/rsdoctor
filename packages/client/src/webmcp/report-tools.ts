import type { Manifest, Rule } from '@rsdoctor/shared/types';
import { Summary } from '@rsdoctor/shared/common-browser';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
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
    buildDurationMs: (data.summary?.costs ?? [])
      .filter((cost) => cost.name !== Summary.SummaryCostsDataName.Minify)
      .reduce((total, cost) => total + cost.costs, 0),
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
): ModelContextTool {
  return {
    name,
    description,
    inputSchema: {
      type: 'object',
      properties,
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: true,
    },
    execute: async (input) => execute(input),
  };
}

export type { AssetSummary, BuildOverview, RuleFinding };
