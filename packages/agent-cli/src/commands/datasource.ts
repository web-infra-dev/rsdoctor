import fs from 'node:fs';
import path from 'node:path';

export interface Chunk {
  id: number;
  name: string;
  size: number;
  modules: unknown[];
  assets: Array<{ name: string; size: number; gzipSize?: number }>;
}

export interface Module {
  id: number;
  path: string;
  name: string;
  webpackId?: string;
  size?: Record<string, unknown>;
  issuerPath?: unknown[];
  dependencies?: unknown[];
  imported?: unknown[];
  chunks?: unknown[];
  isEntry?: boolean;
  bailoutReason?: unknown;
  kind?: string;
  concatenationModules?: unknown[];
}

export interface Package {
  id: number;
  name: string;
  version: string;
  size?: Record<string, unknown>;
  duplicates?: unknown[];
  root?: string;
}

interface PackageDependency {
  id: number;
  dependency: number;
  package?: number;
  refDependency?: number;
}

interface RsdoctorError {
  id: string;
  code: string;
  title: string;
  description: string;
  level: string;
  category: string;
  type: string;
  link?: string;
  error?: unknown;
  stack?: string;
  packages?: unknown[];
}

export interface RsdoctorData {
  data?: {
    chunkGraph?: {
      chunks?: Array<{
        id: number | string;
        name?: string;
        size?: number;
        modules?: unknown[];
      }>;
      assets?: Array<{
        path?: string;
        name?: string;
        size?: number;
        gzipSize?: number;
        chunks?: unknown[];
      }>;
      entrypoints?: unknown[];
    };
    moduleGraph?: {
      modules?: Module[];
      dependencies?: Array<{ module: number; issuer: number }>;
      exports?: unknown[];
    };
    packageGraph?: {
      packages?: Package[];
      dependencies?: PackageDependency[];
    };
    errors?: RsdoctorError[];
    loader?:
      | unknown[]
      | {
          chartData?: unknown[];
          data?: unknown[];
          directories?: unknown[];
          directoriesData?: unknown[];
        };
    summary?: {
      costs?: Array<{ costs?: number }>;
    };
    configs?: Array<{ config?: unknown }>;
  };
}

// ---------------------------------------------------------------------------
// State: safe because each CLI invocation is a separate process
// ---------------------------------------------------------------------------

let _dataFilePath: string | null = null;
let jsonDataCache: RsdoctorData | null = null;
let cachedFilePath: string | null = null;

export function setDataFilePath(filePath: string): void {
  _dataFilePath = path.resolve(filePath);
}

export function getDataFilePath(): string | null {
  return _dataFilePath;
}

export function loadJsonData(filePath: string): RsdoctorData {
  if (jsonDataCache && cachedFilePath === filePath) {
    return jsonDataCache;
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`Data file not found: ${filePath}`);
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content) as RsdoctorData;
    jsonDataCache = data;
    cachedFilePath = filePath;
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load data file: ${message}`);
  }
}

export function requireDataFile(): RsdoctorData {
  if (!_dataFilePath) {
    throw new Error('No data file specified. Use --data-file <path>');
  }
  return loadJsonData(_dataFilePath);
}

// ---------------------------------------------------------------------------
// Chunks
// ---------------------------------------------------------------------------

export function getChunks(
  pageNumber: number = 1,
  pageSize: number = 100,
): {
  total: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  items: Chunk[];
} {
  const data = requireDataFile();
  const chunkGraph = data?.data?.chunkGraph;
  if (!chunkGraph) {
    return { total: 0, pageNumber: 1, pageSize, totalPages: 0, items: [] };
  }

  const chunks = chunkGraph.chunks || [];
  const assets = chunkGraph.assets || [];

  const allChunks = chunks.map((chunk) => {
    const chunkAssets = assets.filter((asset) =>
      asset.chunks?.includes(chunk.id),
    );
    const totalSize = chunkAssets.reduce(
      (sum, asset) => sum + (asset.size || 0),
      0,
    );
    const chunkId = typeof chunk.id === 'string' ? Number(chunk.id) : chunk.id;
    return {
      id: chunkId,
      name: chunk.name || `chunk-${chunk.id}`,
      size: totalSize || chunk.size || 0,
      modules: chunk.modules || [],
      assets: chunkAssets.map((a) => ({
        name: a.path || a.name || '',
        size: a.size || 0,
        ...(a.gzipSize !== undefined ? { gzipSize: a.gzipSize } : {}),
      })),
    };
  });

  const total = allChunks.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (pageNumber - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return {
    total,
    pageNumber,
    pageSize,
    totalPages,
    items: allChunks.slice(startIndex, endIndex),
  };
}

export function getChunkById(chunkId: string | number): Chunk | undefined {
  const chunksResult = getChunks(1, Number.MAX_SAFE_INTEGER);
  const targetId = typeof chunkId === 'string' ? Number(chunkId) : chunkId;
  return chunksResult.items.find(
    (chunk) => chunk.id === targetId || String(chunk.id) === String(chunkId),
  );
}

// ---------------------------------------------------------------------------
// Modules
// ---------------------------------------------------------------------------

export function getModules(): Module[] {
  const data = requireDataFile();
  const moduleGraph = data?.data?.moduleGraph;
  if (!moduleGraph) return [];
  const modules = moduleGraph.modules || [];
  return modules.map((module) => ({
    id: module.id,
    path: module.path || module.webpackId || module.name || '',
    name: module.webpackId || module.name || module.path || '',
    webpackId: module.webpackId,
    size: module.size || {},
    issuerPath: module.issuerPath || [],
    dependencies: module.dependencies || [],
    imported: module.imported || [],
    chunks: module.chunks || [],
    isEntry: module.isEntry || false,
    bailoutReason: module.bailoutReason,
    kind: module.kind,
    concatenationModules: module.concatenationModules,
  }));
}

export function getModulesByPath(
  modulePath: string,
): Array<{ id: number; path: string; name: string; webpackId?: string }> {
  const modules = getModules();
  const lowerPath = modulePath.toLowerCase();
  return modules
    .filter(
      (module) =>
        module.path?.toLowerCase().includes(lowerPath) ||
        module.name?.toLowerCase().includes(lowerPath) ||
        module.webpackId?.toLowerCase().includes(lowerPath),
    )
    .map((module) => ({
      id: module.id,
      path: module.path,
      name: module.name,
      webpackId: module.webpackId,
    }));
}

export function getModuleById(moduleId: string): Module | undefined {
  const modules = getModules();
  return modules.find((module) => module.id === Number(moduleId));
}

export function getModuleIssuerPath(
  moduleId: string,
): Array<{ id: number; path: string; name: string }> {
  const data = requireDataFile();
  const moduleGraph = data?.data?.moduleGraph;
  if (!moduleGraph) return [];

  const modules = moduleGraph.modules || [];
  const dependencies = moduleGraph.dependencies || [];
  const issuerPath: Array<{ id: number; path: string; name: string }> = [];
  const visited = new Set<number>();

  const findIssuers = (targetModuleId: number) => {
    if (visited.has(targetModuleId)) return;
    visited.add(targetModuleId);

    const issuers = dependencies
      .filter((dep) => dep.module === targetModuleId)
      .map((dep) => dep.issuer)
      .filter(Boolean);

    for (const issuerId of issuers) {
      const issuer = modules.find((m) => m.id === issuerId);
      if (issuer) {
        issuerPath.push({
          id: issuer.id,
          path: issuer.path || issuer.webpackId || '',
          name: issuer.webpackId || issuer.name || '',
        });
        findIssuers(issuerId);
      }
    }
  };

  findIssuers(Number(moduleId));
  return issuerPath.reverse();
}

export function getModuleExports(): unknown[] {
  const data = requireDataFile();
  return data?.data?.moduleGraph?.exports || [];
}

// ---------------------------------------------------------------------------
// Packages
// ---------------------------------------------------------------------------

export function getPackages(): Package[] {
  const data = requireDataFile();
  const packageGraph = data?.data?.packageGraph;
  if (!packageGraph) return [];
  const packages = packageGraph.packages || [];
  return packages.map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    version: pkg.version,
    size: pkg.size || {},
    duplicates: pkg.duplicates || [],
    root: pkg.root,
  }));
}

export function getPackagesFiltered(): Array<{
  id: number;
  name: string;
  version: string;
  size: unknown;
  duplicates: unknown;
}> {
  const packages = getPackages();
  return packages.map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    version: pkg.version,
    size: pkg.size,
    duplicates: pkg.duplicates,
  }));
}

export function getPackagesByName(packageName: string): Package[] {
  const packages = getPackages();
  return packages.filter((pkg) => pkg.name === packageName);
}

function isThirdPartyPackage(pkg: Package): boolean {
  return Boolean(pkg.root?.includes('node_modules'));
}

function isProjectPackage(pkg: Package | undefined): boolean {
  return !pkg || !isThirdPartyPackage(pkg);
}

export function getDirectDependencyPackages(): Array<{
  id: number;
  name: string;
  version: string;
  root?: string;
  size: unknown;
  duplicates: unknown;
  dependencyIds: number[];
  refDependencyIds: number[];
}> {
  const data = requireDataFile();
  const packageGraph = data?.data?.packageGraph;
  if (!packageGraph) return [];

  const packages = getPackages();
  const packageMap = new Map(packages.map((pkg) => [pkg.id, pkg]));
  const directDependencies = new Map<
    number,
    {
      pkg: Package;
      dependencyIds: number[];
      refDependencyIds: number[];
    }
  >();

  for (const dependency of packageGraph.dependencies || []) {
    const dependencyPkg = packageMap.get(dependency.dependency);
    const importerPkg = dependency.package
      ? packageMap.get(dependency.package)
      : undefined;

    if (!dependencyPkg) continue;
    if (!isProjectPackage(importerPkg)) continue;
    if (!isThirdPartyPackage(dependencyPkg)) continue;

    const current = directDependencies.get(dependencyPkg.id) ?? {
      pkg: dependencyPkg,
      dependencyIds: [],
      refDependencyIds: [],
    };
    current.dependencyIds.push(dependency.id);
    if (dependency.refDependency !== undefined) {
      current.refDependencyIds.push(dependency.refDependency);
    }
    directDependencies.set(dependencyPkg.id, current);
  }

  return Array.from(directDependencies.values())
    .map(({ pkg, dependencyIds, refDependencyIds }) => ({
      id: pkg.id,
      name: pkg.name,
      version: pkg.version,
      root: pkg.root,
      size: pkg.size || {},
      duplicates: pkg.duplicates || [],
      dependencyIds,
      refDependencyIds,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getPackageDependencies(
  pageNumber: number = 1,
  pageSize: number = 100,
): {
  total: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  items: unknown[];
} {
  const data = requireDataFile();
  const packageGraph = data?.data?.packageGraph;
  if (!packageGraph) {
    return { total: 0, pageNumber: 1, pageSize, totalPages: 0, items: [] };
  }
  const dependencies = packageGraph.dependencies || [];
  const total = dependencies.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (pageNumber - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return {
    total,
    pageNumber,
    pageSize,
    totalPages,
    items: dependencies.slice(startIndex, endIndex),
  };
}

// ---------------------------------------------------------------------------
// Rules / Overlay Alerts
// ---------------------------------------------------------------------------

export function getRules(): Array<{
  id: string;
  code: string;
  title: string;
  description: string;
  level: string;
  category: string;
  type: string;
}> {
  const data = requireDataFile();
  const errors = data?.data?.errors || [];
  return errors.map((error) => ({
    id: error.id,
    code: error.code,
    title: error.title,
    description: error.description,
    level: error.level,
    category: error.category,
    type: error.type,
  }));
}

// ---------------------------------------------------------------------------
// Loaders
// ---------------------------------------------------------------------------

export function getLoaderChartData(): unknown[] {
  const data = requireDataFile();
  const loader = data?.data?.loader;
  if (!loader) return [];
  if (Array.isArray(loader)) return loader;
  return (
    (loader as { chartData?: unknown[]; data?: unknown[] }).chartData ||
    (loader as { chartData?: unknown[]; data?: unknown[] }).data ||
    []
  );
}

export function getLoaderDirectories(): unknown[] {
  const data = requireDataFile();
  const loader = data?.data?.loader;
  if (!loader) return [];
  if (Array.isArray(loader)) return loader;
  return (
    (loader as { directories?: unknown[]; directoriesData?: unknown[] })
      .directories ||
    (loader as { directories?: unknown[]; directoriesData?: unknown[] })
      .directoriesData ||
    []
  );
}

export function getLongLoadersByCosts(): Array<{ costs: number }> {
  const loaders = getLoaderChartData() as Array<{ costs: number }>;
  const sorted = [...loaders].sort((a, b) => b.costs - a.costs);
  const count = Math.ceil(sorted.length / 3);
  return sorted.slice(0, count);
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

export function getBuildSummary(): {
  costs: Array<{ costs?: number }>;
  totalCost: number;
} | null {
  const data = requireDataFile();
  const summary = data?.data?.summary;
  if (!summary) return null;
  return {
    costs: summary.costs || [],
    totalCost:
      summary.costs?.reduce((sum, cost) => sum + (cost.costs || 0), 0) || 0,
  };
}

export function getAssets(): unknown[] {
  const data = requireDataFile();
  return data?.data?.chunkGraph?.assets || [];
}

export function getEntrypoints(): unknown[] {
  const data = requireDataFile();
  return data?.data?.chunkGraph?.entrypoints || [];
}

export function getBuildConfig(): unknown | null {
  const data = requireDataFile();
  const configs = data?.data?.configs;
  if (!configs || !configs.length) return null;
  return configs[0]?.config || null;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export function getErrors(): RsdoctorError[] {
  const data = requireDataFile();
  const errors = data?.data?.errors || [];
  return errors.map((error) => ({
    id: error.id,
    code: error.code,
    title: error.title,
    description: error.description,
    level: error.level,
    category: error.category,
    type: error.type,
    link: error.link,
    error: error.error,
    stack: error.stack,
    packages: error.packages,
  }));
}

export * from './datasource/tree-shaking';
