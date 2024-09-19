import { Client, Manifest, SDK } from '@rsdoctor/types';
import { UpdateType } from './constants';

import { InferServerAPIBody } from '../../../../components/Manifest/api';

export type BundleDiffServerAPIProviderComponentCommonProps<
  T extends SDK.ServerAPI.API | SDK.ServerAPI.APIExtends,
> = {
  manifests?: Manifest.RsdoctorManifest[];
  api: T;
  children: (
    baseline: SDK.ServerAPI.InferResponseType<T>,
    current: SDK.ServerAPI.InferResponseType<T>,
  ) => JSX.Element;
} & InferServerAPIBody<T>;

export interface BundleDiffContainerProps {
  manifests: Manifest.RsdoctorManifest[];
}
export interface BundleDiffComponentCommonProps {
  baseline: Manifest.RsdoctorManifest;
  current: Manifest.RsdoctorManifest;
  onlyBaseline: boolean;
  assetsDiffResult: Client.RsdoctorClientAssetsDiffResult;
}

export interface BundleDiffComponentCardProps {
  baseline: SDK.ServerAPI.ResponseTypes[SDK.ServerAPI.API.GetBundleDiffSummary];
  current: SDK.ServerAPI.ResponseTypes[SDK.ServerAPI.API.GetBundleDiffSummary];
  onlyBaseline: boolean;
  assetsDiffResult: Client.RsdoctorClientAssetsDiffResult;
}

export interface BundleDiffTableOverviewData {
  total: Client.RsdoctorClientAssetsDiffItem;
  initial?: Client.RsdoctorClientAssetsDiffItem;
}

export interface BundleDiffTableAssetsData {
  alias: string;
  baseline?: SDK.AssetData;
  current?: SDK.AssetData;
}

export interface BundleDiffTableModulesData {
  path: string;
  baseline?: SDK.ModuleData;
  current?: SDK.ModuleData;
  __is_baseline__?: boolean;
}

export interface BundleDiffTablePackagesData {
  name: string;
  updateType: UpdateType;
  baseline?: SDK.PackageData[];
  current?: SDK.PackageData[];
}
