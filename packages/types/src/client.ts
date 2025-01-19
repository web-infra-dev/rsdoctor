export enum RsdoctorClientUrlQuery {
  BundleDiffFiles = '__bundle_files__',
  ManifestFile = 'manifest',
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
