import {
  getChunks,
  requireDataFile,
  type Chunk,
  type Module,
  type Package,
} from '../datasource';
import { paginateItems } from '../utils';

interface BailoutModule {
  id: number;
  path: string;
  bailoutReason: unknown;
  size: Record<string, number>;
  chunks: unknown[];
}

export type SideEffectsCategory =
  | 'cjs'
  | 'barrel'
  | 'side-effects'
  | 'dynamic-import';

export type RetainedModuleCategory = SideEffectsCategory | 'unknown';

export const sideEffectsCategories: SideEffectsCategory[] = [
  'cjs',
  'barrel',
  'side-effects',
  'dynamic-import',
];

export const retainedModuleCategories: RetainedModuleCategory[] = [
  ...sideEffectsCategories,
  'unknown',
];

function matchesSideEffectsCategory(
  module: BailoutModule,
  category: SideEffectsCategory,
): boolean {
  return getRetainedModuleCategory(module.bailoutReason) === category;
}

function matchesModuleFilters(
  module: Module,
  normalizedFilters: string[],
): boolean {
  if (!normalizedFilters.length) {
    return true;
  }
  const candidates = [
    String(module.id),
    module.path,
    module.webpackId,
    module.name,
  ].filter((item): item is string => !!item);
  return normalizedFilters.some((filter) =>
    candidates.some(
      (candidate) =>
        candidate === filter ||
        candidate.toLowerCase().includes(filter.toLowerCase()),
    ),
  );
}

function toBailoutModule(module: Module): BailoutModule {
  return {
    id: module.id,
    path: module.path || module.webpackId || module.name || '',
    bailoutReason: module.bailoutReason!,
    size: (module.size as Record<string, number>) || {},
    chunks: module.chunks || [],
  };
}

function getBailoutModules(
  moduleFilters: Array<string | number> = [],
): BailoutModule[] {
  const data = requireDataFile();
  const modules = data?.data?.moduleGraph?.modules || [];
  const normalizedFilters = moduleFilters
    .map((item) => String(item).trim())
    .filter(Boolean);

  return modules
    .filter((module) => module.bailoutReason)
    .filter((module) => matchesModuleFilters(module, normalizedFilters))
    .map((module) => toBailoutModule(module));
}

function getRetainedModuleCategory(
  bailoutReason: unknown,
): RetainedModuleCategory {
  const reason = stringifyBailoutReason(bailoutReason).toLowerCase();

  if (
    reason.includes('cjs') ||
    reason.includes('commonjs') ||
    reason.includes('require(') ||
    reason.includes('require()') ||
    reason.includes('module.exports') ||
    reason.includes('exports.')
  ) {
    return 'cjs';
  }
  if (
    reason.includes('barrel') ||
    reason.includes('re-export') ||
    reason.includes('reexport') ||
    reason.includes('export *')
  ) {
    return 'barrel';
  }
  if (reason.includes('side effect')) {
    return 'side-effects';
  }
  if (reason.includes('dynamic import') || reason.includes('import()')) {
    return 'dynamic-import';
  }
  return 'unknown';
}

function stringifyBailoutReason(bailoutReason: unknown): string {
  if (typeof bailoutReason === 'string') {
    return bailoutReason;
  }
  if (typeof bailoutReason === 'number' || typeof bailoutReason === 'boolean') {
    return String(bailoutReason);
  }
  if (Array.isArray(bailoutReason)) {
    return bailoutReason.map((item) => stringifyBailoutReason(item)).join(' ');
  }
  if (bailoutReason && typeof bailoutReason === 'object') {
    const record = bailoutReason as Record<string, unknown>;
    const preferredFields = [
      'reason',
      'message',
      'description',
      'detail',
      'title',
      'type',
      'code',
    ];
    const preferredText = preferredFields
      .map((field) => record[field])
      .filter((value) => value !== undefined)
      .map((value) => stringifyBailoutReason(value))
      .filter(Boolean)
      .join(' ');
    if (preferredText) {
      return preferredText;
    }
    try {
      return JSON.stringify(bailoutReason);
    } catch {
      return String(bailoutReason);
    }
  }
  return '';
}

function isSameId(left: unknown, right: unknown): boolean {
  return String(left) === String(right);
}

function getModuleChunkIds(module: BailoutModule, chunks: Chunk[]): unknown[] {
  const ids = [...(module.chunks || [])];
  for (const chunk of chunks) {
    if (chunk.modules.some((moduleId) => isSameId(moduleId, module.id))) {
      ids.push(chunk.id);
    }
  }
  return Array.from(new Set(ids.map((id) => String(id))));
}

function getPackageNameFromModulePath(modulePath: string): string | undefined {
  const normalizedModulePath = modulePath.replace(/\\/g, '/');
  const match = normalizedModulePath.match(
    /node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?((?:@[^/]+\/)?[^/]+)/,
  );
  return match?.[1];
}

function getPackageForModule(
  modulePath: string,
  packages: Package[],
): { packageName?: string; version?: string } {
  const normalizedModulePath = modulePath.replace(/\\/g, '/');
  const packageMatch = packages
    .filter((pkg) => pkg.root)
    .map((pkg) => ({
      pkg,
      root: pkg.root!.replace(/\\/g, '/'),
    }))
    .filter(({ root }) => normalizedModulePath.startsWith(root))
    .sort((a, b) => b.root.length - a.root.length)[0];

  if (packageMatch) {
    return {
      packageName: packageMatch.pkg.name,
      version: packageMatch.pkg.version,
    };
  }

  const packageName = getPackageNameFromModulePath(normalizedModulePath);
  if (!packageName) {
    return {};
  }
  const pkg = packages.find((item) => item.name === packageName);
  return {
    packageName,
    version: pkg?.version,
  };
}

function getRecommendation(category: RetainedModuleCategory): string {
  if (category === 'cjs') {
    return 'Prefer static ESM imports/exports over require or module.exports.';
  }
  if (category === 'barrel') {
    return 'Import from source modules or replace export * barrels with explicit exports.';
  }
  if (category === 'side-effects') {
    return 'Review side effects and mark safe files/packages as sideEffects: false.';
  }
  if (category === 'dynamic-import') {
    return 'Keep import() targets explicit so exports can be analyzed.';
  }
  return 'Inspect the bailout reason and convert non-static patterns where possible.';
}

function pickFields(
  item: Record<string, unknown>,
  filterFields: string[] = [],
): Record<string, unknown> {
  if (!filterFields.length) {
    return item;
  }
  const output: Record<string, unknown> = {};
  for (const field of filterFields) {
    if (field in item) {
      output[field] = item[field];
    }
  }
  return output;
}

export function getSideEffects(
  pageNumber: number = 1,
  pageSize: number = 100,
): {
  total: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  nodeModules: {
    count: number;
    topPackages: Array<{
      name: string;
      count: number;
      totalSize: number;
      modules: BailoutModule[];
    }>;
  };
  userCode: { count: number; totalPages: number; modules: BailoutModule[] };
  all: BailoutModule[];
} {
  const bailoutModules = getBailoutModules();
  if (!bailoutModules.length) {
    return {
      total: 0,
      pageNumber: 1,
      pageSize,
      totalPages: 0,
      nodeModules: { count: 0, topPackages: [] },
      userCode: { count: 0, totalPages: 0, modules: [] },
      all: [],
    };
  }

  const nodeModules: BailoutModule[] = [];
  const userCode: BailoutModule[] = [];
  const packageStats = new Map<
    string,
    { count: number; totalSize: number; modules: BailoutModule[] }
  >();

  for (const module of bailoutModules) {
    const modulePath = module.path || '';
    const isNodeModule = modulePath.includes('node_modules');

    if (isNodeModule) {
      nodeModules.push(module);
      const packageName = getPackageNameFromModulePath(modulePath);
      if (packageName) {
        const stats = packageStats.get(packageName) || {
          count: 0,
          totalSize: 0,
          modules: [],
        };
        stats.count += 1;
        stats.totalSize +=
          module.size?.parsedSize || module.size?.sourceSize || 0;
        stats.modules.push(module);
        packageStats.set(packageName, stats);
      }
    } else {
      userCode.push(module);
    }
  }

  const topPackages = Array.from(packageStats.entries())
    .map(([name, stats]) => ({
      name,
      count: stats.count,
      totalSize: stats.totalSize,
      modules: stats.modules,
    }))
    .sort((a, b) => b.totalSize - a.totalSize);

  const allPage = paginateItems(bailoutModules, pageNumber, pageSize);
  const userCodePage = paginateItems(userCode, pageNumber, pageSize);

  return {
    total: allPage.total,
    pageNumber: allPage.pageNumber,
    pageSize: allPage.pageSize,
    totalPages: allPage.totalPages,
    nodeModules: {
      count: nodeModules.length,
      topPackages: topPackages.slice(0, 10),
    },
    userCode: {
      count: userCodePage.total,
      totalPages: userCodePage.totalPages,
      modules: userCodePage.items,
    },
    all: allPage.items,
  };
}

export function getSideEffectsByCategory(
  category: SideEffectsCategory,
  pageNumber: number = 1,
  pageSize: number = 100,
): {
  category: SideEffectsCategory;
  total: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  modules: BailoutModule[];
} {
  const modules = getBailoutModules().filter((module) =>
    matchesSideEffectsCategory(module, category),
  );
  const page = paginateItems(modules, pageNumber, pageSize);

  return {
    category,
    total: page.total,
    pageNumber: page.pageNumber,
    pageSize: page.pageSize,
    totalPages: page.totalPages,
    modules: page.items,
  };
}

export function getRetainedModules(options: {
  emittedOnly?: boolean;
  categories?: RetainedModuleCategory[];
  sort?: 'sourceSize' | 'parsedSize' | 'gzipSize';
  limit?: number;
  filterFields?: string[];
}): {
  total: number;
  emittedOnly: boolean;
  categories: RetainedModuleCategory[];
  sort: string;
  limit: number;
  items: Array<Record<string, unknown>>;
} {
  const data = requireDataFile();
  const chunks = getChunks(1, Number.MAX_SAFE_INTEGER).items;
  const packages = data?.data?.packageGraph?.packages || [];
  const selectedCategories = options.categories?.length
    ? options.categories
    : retainedModuleCategories;
  const emittedOnly = options.emittedOnly ?? false;
  const sort = options.sort ?? 'parsedSize';
  const limit = options.limit ?? 100;

  const items = getBailoutModules()
    .map((module) => {
      const moduleChunkIds = getModuleChunkIds(module, chunks);
      const moduleChunks = chunks
        .filter((chunk) =>
          moduleChunkIds.some((chunkId) => isSameId(chunkId, chunk.id)),
        )
        .map((chunk) => ({
          id: chunk.id,
          name: chunk.name,
          assets: chunk.assets,
        }));
      const category = getRetainedModuleCategory(module.bailoutReason);
      const packageInfo = getPackageForModule(module.path, packages);
      const size = {
        sourceSize: module.size.sourceSize ?? 0,
        parsedSize: module.size.parsedSize ?? 0,
        gzipSize: module.size.gzipSize ?? 0,
      };

      return {
        id: module.id,
        path: module.path,
        packageName: packageInfo.packageName,
        version: packageInfo.version,
        category,
        size,
        chunks: moduleChunks,
        bailoutReason: module.bailoutReason,
        recommendation: getRecommendation(category),
      };
    })
    .filter((item) =>
      selectedCategories.includes(item.category as RetainedModuleCategory),
    )
    .filter(
      (item) =>
        !emittedOnly ||
        (item.chunks as Array<{ assets: unknown[] }>).some(
          (chunk) => chunk.assets.length > 0,
        ),
    )
    .sort((a, b) => {
      const left = (a.size as Record<string, number>)[sort] ?? 0;
      const right = (b.size as Record<string, number>)[sort] ?? 0;
      return right - left;
    });

  return {
    total: items.length,
    emittedOnly,
    categories: selectedCategories,
    sort,
    limit,
    items: items
      .slice(0, limit)
      .map((item) => pickFields(item, options.filterFields)),
  };
}

export function getBailoutReasonModules(
  pageNumber: number = 1,
  pageSize: number = 100,
  moduleFilters: Array<string | number> = [],
): {
  total: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  modules: BailoutModule[];
} {
  const page = paginateItems(
    getBailoutModules(moduleFilters),
    pageNumber,
    pageSize,
  );

  return {
    total: page.total,
    pageNumber: page.pageNumber,
    pageSize: page.pageSize,
    totalPages: page.totalPages,
    modules: page.items,
  };
}
