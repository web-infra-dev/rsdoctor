import type { ModuleSize } from './sdk/module';

export enum RsdoctorClientUrlQuery {
  BundleDiffFiles = '__bundle_files__',
  ManifestFile = 'manifest',
  EnableRoutes = 'enableRoutes',
}

export enum RsdoctorClientRoutes {
  Home = '/',
  Overall = '/overall',
  WebpackLoaderOverall = '/webpack/loaders/overall',
  WebpackLoaderAnalysis = '/webpack/loaders/analysis',
  ModuleResolve = '/module/resolve',
  WebpackPlugins = '/webpack/plugins',
  BundleSize = '/bundle/size',
  ModuleAnalyze = '/module/analyze',
  TreeShaking = '/treeshaking',
  BundleDiff = '/resources/bundle/diff',
  RuleIndex = '/resources/rules',
  Uploader = '/resources/uploader',
  EmoCheck = '/emo/check',
  PackageGraph = '/bundle/packages',
}

export enum RsdoctorClientDiffState {
  Equal = '-',
  Up = 'UP',
  Down = 'DOWN',
}

export interface RsdoctorClientAssetsDiffItem {
  size: {
    baseline: number;
    current: number;
  };
  count: {
    baseline: number;
    current: number;
  };
  percent: number;
  state: RsdoctorClientDiffState;
}

export interface RsdoctorClientAssetsDiffResult {
  all: {
    total: RsdoctorClientAssetsDiffItem;
  };
  js: {
    total: RsdoctorClientAssetsDiffItem;
    initial: RsdoctorClientAssetsDiffItem;
  };
  css: {
    total: RsdoctorClientAssetsDiffItem;
    initial: RsdoctorClientAssetsDiffItem;
  };
  imgs: {
    total: RsdoctorClientAssetsDiffItem;
  };
  html: {
    total: RsdoctorClientAssetsDiffItem;
  };
  media: {
    total: RsdoctorClientAssetsDiffItem;
  };
  fonts: {
    total: RsdoctorClientAssetsDiffItem;
  };
  /**
   * files exclude these extensions above
   */
  others: {
    total: RsdoctorClientAssetsDiffItem;
  };
}

interface AssetInfo {
  size: number;
  count: number;
  files: {
    path: string;
    size: number;
    initial: boolean;
    content: string | void;
  }[];
}

export interface RsdoctorClientAssetsSummary {
  all: {
    total: AssetInfo;
  };
  js: {
    total: AssetInfo;
    initial: AssetInfo;
  };
  css: {
    total: AssetInfo;
    initial: AssetInfo;
  };
  imgs: {
    total: AssetInfo;
  };
  html: {
    total: AssetInfo;
  };
  media: {
    total: AssetInfo;
  };
  fonts: {
    total: AssetInfo;
  };
  /**
   * files exclude these extensions above
   */
  others: {
    total: AssetInfo;
  };
}

export interface RsdoctorClientModuleDiffItem {
  path: string;
  size: {
    baseline: ModuleSize;
    current: ModuleSize;
  };
  /** Percent change based on parsedSize */
  percent: number;
  state: RsdoctorClientDiffState;
}

export interface RsdoctorClientModulesDiffResult {
  added: Array<{ path: string; size: ModuleSize }>;
  removed: Array<{ path: string; size: ModuleSize }>;
  changed: RsdoctorClientModuleDiffItem[];
}

export interface RsdoctorClientPackageDiffItem {
  name: string;
  version: string;
  root: string;
  size: {
    baseline: ModuleSize;
    current: ModuleSize;
  };
  /** Percent change based on parsedSize */
  percent: number;
  state: RsdoctorClientDiffState;
}

export interface RsdoctorClientPackagesDiffResult {
  added: Array<{
    name: string;
    version: string;
    root: string;
    size: ModuleSize;
  }>;
  removed: Array<{
    name: string;
    version: string;
    root: string;
    size: ModuleSize;
  }>;
  changed: RsdoctorClientPackageDiffItem[];
}

export interface RsdoctorClientBundleDiffResult {
  assets: RsdoctorClientAssetsDiffResult;
  modules: RsdoctorClientModulesDiffResult;
  packages: RsdoctorClientPackagesDiffResult;
}
