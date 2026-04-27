import {
  getDirectDependencyPackages,
  getPackageDependencies as getPackageDepsFromData,
  getPackages,
  getPackagesByName,
  getPackagesFiltered,
  getRules,
} from '../datasource';
import { paginateItems, parsePositiveInt, requireArg } from '../utils';

interface Rule {
  code?: string;
  description?: string;
}

interface Package {
  name: string;
}

export async function listPackages(
  pageNumberInput?: string,
  pageSizeInput?: string,
): Promise<{ ok: boolean; data: unknown; description: string }> {
  const pageNumber =
    parsePositiveInt(pageNumberInput, 'pageNumber', { min: 1 }) ?? 1;
  const pageSize =
    parsePositiveInt(pageSizeInput, 'pageSize', { min: 1, max: 1000 }) ?? 100;

  const allPackages = getPackagesFiltered();
  const page = paginateItems(allPackages, pageNumber, pageSize);

  return {
    ok: true,
    data: {
      total: page.total,
      pageNumber: page.pageNumber,
      pageSize: page.pageSize,
      totalPages: page.totalPages,
      items: page.items,
    },
    description: 'List packages with size/duplication info.',
  };
}

export async function getPackageByName(
  packageNameInput: string | undefined,
): Promise<{ ok: boolean; data: unknown; description: string }> {
  const packageName = requireArg(packageNameInput, 'name');
  const packages = getPackagesByName(packageName);
  return {
    ok: true,
    data: packages,
    description: 'Get package entries by name.',
  };
}

export async function getPackageDependencies(
  pageNumberInput?: string,
  pageSizeInput?: string,
): Promise<{ ok: boolean; data: unknown; description: string }> {
  const pageNumber =
    parsePositiveInt(pageNumberInput, 'pageNumber', { min: 1 }) ?? 1;
  const pageSize =
    parsePositiveInt(pageSizeInput, 'pageSize', { min: 1, max: 100 }) ?? 100;

  const dependencies = getPackageDepsFromData(pageNumber, pageSize);
  return {
    ok: true,
    data: dependencies,
    description: 'Get package dependency graph.',
  };
}

export async function listDirectDependencyPackages(): Promise<{
  ok: boolean;
  data: unknown;
  description: string;
}> {
  const packages = getDirectDependencyPackages();
  return {
    ok: true,
    data: {
      total: packages.length,
      items: packages,
    },
    description:
      'List third-party packages directly imported by project/local packages.',
  };
}

export async function detectDuplicatePackages(): Promise<{
  ok: boolean;
  data: { rule: Rule | null; totalRules: number; note?: string };
  description: string;
}> {
  const rules = getRules() as Rule[];
  const duplicateRule = rules?.find((rule) => rule.code === 'E1001');
  return {
    ok: true,
    data: {
      rule: duplicateRule ?? null,
      totalRules: rules?.length ?? 0,
      note: duplicateRule
        ? undefined
        : 'No E1001 duplicate package rule found in current analysis.',
    },
    description:
      'Detect duplicate packages using E1001 overlay rule if present.',
  };
}

export async function detectSimilarPackages(): Promise<{
  ok: boolean;
  data: { similarPackages: string[][]; totalPackages: number; note?: string };
  description: string;
}> {
  const packages = getPackages() as Package[];
  const rules = [
    ['lodash', 'lodash-es', 'string_decode'],
    ['dayjs', 'moment', 'date-fns', 'js-joda'],
    ['antd', 'material-ui', 'semantic-ui-react', 'arco-design'],
    ['axios', 'node-fetch'],
    ['redux', 'mobx', 'zustand', 'recoil', 'jotai'],
    ['chalk', 'colors', 'picocolors', 'kleur'],
    ['fs-extra', 'graceful-fs'],
  ];

  const matches = rules
    .map((group) => {
      const found = group.filter((pkg) =>
        packages.some((p) => p.name.toLowerCase() === pkg.toLowerCase()),
      );
      return found.length > 1 ? found : null;
    })
    .filter((match): match is string[] => match !== null);

  return {
    ok: true,
    data: {
      similarPackages: matches,
      totalPackages: packages.length,
      note: matches.length
        ? undefined
        : 'No similar package groups detected in current analysis.',
    },
    description: 'Detect similar packages (lodash/lodash-es etc.).',
  };
}
