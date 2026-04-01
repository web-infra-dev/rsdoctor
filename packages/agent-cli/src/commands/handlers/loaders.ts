import { getLoaderDirectories, getLongLoadersByCosts } from '../datasource';
import { paginateItems, parseNumber, parsePositiveInt } from '../utils';

interface LoaderItem {
  costs?: number;
  [key: string]: unknown;
}

interface DirectoryItem {
  totalCosts?: number;
  [key: string]: unknown;
}

export async function getHotFiles(
  pageNumberInput?: string,
  pageSizeInput?: string,
  minCostsInput?: string,
): Promise<{ ok: boolean; data: unknown; description: string }> {
  const pageNumber =
    parsePositiveInt(pageNumberInput, 'pageNumber', { min: 1 }) ?? 1;
  const pageSize =
    parsePositiveInt(pageSizeInput, 'pageSize', { min: 1, max: 1000 }) ?? 100;
  const minCosts = parseNumber(minCostsInput, 'minCosts');

  const hotFiles = getLongLoadersByCosts() as LoaderItem[];
  let filtered = hotFiles;
  if (minCosts !== undefined) {
    filtered = hotFiles.filter((item) => (item.costs ?? 0) >= minCosts);
  }

  const page = paginateItems(filtered, pageNumber, pageSize);

  return {
    ok: true,
    data: {
      total: page.total,
      pageNumber: page.pageNumber,
      pageSize: page.pageSize,
      totalPages: page.totalPages,
      minCosts: minCosts ?? null,
      items: page.items,
    },
    description:
      'Top third slowest loader/file pairs to surface expensive transforms.',
  };
}

export async function getDirectories(
  pageNumberInput?: string,
  pageSizeInput?: string,
  minTotalCostsInput?: string,
): Promise<{ ok: boolean; data: unknown; description: string }> {
  const pageNumber =
    parsePositiveInt(pageNumberInput, 'pageNumber', { min: 1 }) ?? 1;
  const pageSize =
    parsePositiveInt(pageSizeInput, 'pageSize', { min: 1, max: 1000 }) ?? 100;
  const minTotalCosts = parseNumber(minTotalCostsInput, 'minTotalCosts');

  const directories = getLoaderDirectories() as DirectoryItem[];
  let filtered = directories;
  if (minTotalCosts !== undefined) {
    filtered = directories.filter(
      (item) => (item.totalCosts ?? 0) >= minTotalCosts,
    );
  }

  const page = paginateItems(filtered, pageNumber, pageSize);

  return {
    ok: true,
    data: {
      total: page.total,
      pageNumber: page.pageNumber,
      pageSize: page.pageSize,
      totalPages: page.totalPages,
      minTotalCosts: minTotalCosts ?? null,
      items: page.items,
    },
    description: 'Loader times grouped by directory.',
  };
}
