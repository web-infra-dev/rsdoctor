import { API } from './constants';
import { getDataFilePath, sendRequest } from './datasource';
import { getTopThirdLoadersByCosts } from './utils';

export const getAllChunks = async (
  pageNumber?: number,
  pageSize?: number,
): Promise<unknown> => {
  const params: Record<string, unknown> = {};
  if (pageNumber !== undefined) params.pageNumber = pageNumber;
  if (pageSize !== undefined) params.pageSize = pageSize;
  return sendRequest(API.GetChunkGraphAI, params);
};

export const getPackageInfo = async (): Promise<unknown> => {
  return sendRequest(API.GetPackageInfo, {});
};

export const getPackageInfoFiltered = async (): Promise<unknown> => {
  const info = (await getPackageInfo()) as Array<{
    id: number;
    name: string;
    version: string;
    size: unknown;
    duplicates: unknown;
  }>;
  return info.map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    version: pkg.version,
    size: pkg.size,
    duplicates: pkg.duplicates,
  }));
};

export const getPackageInfoByPackageName = async (
  packageName: string,
): Promise<unknown> => {
  const info = (await getPackageInfo()) as Array<{ name: string }>;
  return info.filter((pkg) => pkg.name === packageName);
};

export const getPackageDependency = async (
  pageNumber?: number,
  pageSize?: number,
): Promise<unknown> => {
  const params: Record<string, unknown> = {};
  if (pageNumber !== undefined) params.pageNumber = pageNumber;
  if (pageSize !== undefined) params.pageSize = pageSize;
  return sendRequest(API.GetPackageDependency, params);
};

export const getRuleInfo = async (): Promise<unknown> => {
  return sendRequest(API.GetOverlayAlerts, {});
};

export const getLoaderTimeForAllFiles = async (): Promise<unknown> => {
  return sendRequest(API.GetLoaderChartData, {});
};

export const getLongLoadersByCosts = async (): Promise<unknown> => {
  return getTopThirdLoadersByCosts(
    (await getLoaderTimeForAllFiles()) as Array<{ costs: number }>,
  );
};

export const getLoaderTimes = async (): Promise<unknown> => {
  return sendRequest(API.GetDirectoriesLoaders, {});
};

export const getPort = async (): Promise<string> => {
  const filePath = getDataFilePath();
  if (!filePath) {
    throw new Error('No data file specified. Use --data-file <path>');
  }
  return `file://${filePath}`;
};

export const getBuildSummary = async (): Promise<unknown> => {
  return sendRequest(API.GetBuildSummary, {});
};

export const getAssets = async (): Promise<unknown> => {
  return sendRequest(API.GetAssets, {});
};

export const getEntrypoints = async (): Promise<unknown> => {
  return sendRequest(API.GetEntrypoints, {});
};

export const getBuildConfig = async (): Promise<unknown> => {
  return sendRequest(API.GetBuildConfig, {});
};

export const getErrors = async (): Promise<unknown> => {
  return sendRequest(API.GetErrors, {});
};

export const getModuleExports = async (): Promise<unknown> => {
  return sendRequest(API.GetModuleExports, {});
};

export const getSideEffects = async (
  pageNumber?: number,
  pageSize?: number,
): Promise<unknown> => {
  const params: Record<string, unknown> = {};
  if (pageNumber !== undefined) params.pageNumber = pageNumber;
  if (pageSize !== undefined) params.pageSize = pageSize;
  return sendRequest(API.GetSideEffects, params);
};
