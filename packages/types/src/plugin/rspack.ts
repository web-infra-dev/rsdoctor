// biome-ignore assist/source/organizeImports: <explanation>
import type {
  RsdoctorPluginData,
  NormalModuleFactory,
  LoaderDefinitionFunction,
  ModuleGraph,
  Dependency,
} from '@rspack/core';
export type RspackNormalModuleFactory = NormalModuleFactory;

export type RspackNativeAsset = RsdoctorPluginData.RsdoctorAsset;
export type RspackNativeChunkGraph = RsdoctorPluginData.RsdoctorChunkGraph;
export type RspackNativeModuleGraph = RsdoctorPluginData.RsdoctorModuleGraph;
export type RspackNativeChunk = RsdoctorPluginData.RsdoctorChunk;
export type RspackNativeModule = RsdoctorPluginData.RsdoctorModule;
export type RspackNativeSideEffect = RsdoctorPluginData.RsdoctorSideEffect;
export type RspackNativeExportInfo = RsdoctorPluginData.RsdoctorExportInfo;
export type RspackNativeVariable = RsdoctorPluginData.RsdoctorVariable;
export type RspackNativeDependency = RsdoctorPluginData.RsdoctorDependency;
export type RspackNativeEntrypoint = RsdoctorPluginData.RsdoctorEntrypoint;
export type RspackNativeStatement = RsdoctorPluginData.RsdoctorStatement;
export type RspackNativeSourceRange = RsdoctorPluginData.RsdoctorSourceRange;
export type RspackNativeSourcePosition =
  RsdoctorPluginData.RsdoctorSourcePosition;
export type RspackNativeModuleGraphModule =
  RsdoctorPluginData.RsdoctorModuleGraphModule;
export type RspackNativeAssetPatch = RsdoctorPluginData.RsdoctorAssetPatch;
export type RspackNativeModuleIdsPatch =
  RsdoctorPluginData.RsdoctorModuleIdsPatch;
export type RspackNativeChunkModules = RsdoctorPluginData.RsdoctorChunkModules;
export type RspackNativeModuleOriginalSource =
  RsdoctorPluginData.RsdoctorModuleOriginalSource;
export type RspackNativeModuleSourcePatch =
  RsdoctorPluginData.RsdoctorModuleSourcesPatch;

import rspack from '@rspack/core';

export type RspackExportsExperiments = typeof rspack.experiments;

export type RspackSourceMapInput = Parameters<LoaderDefinitionFunction>[1];
// export type SourceMap = Exclude<SourceMapInput, string | undefined>;
export type RspackEntryPoint = boolean | 'auto';
export interface RspackExportInfo {
  used: boolean;
  provideInfo: boolean | null | undefined;
  useInfo: boolean | null | undefined;
  canMangle: boolean;
}

export type RspackExportsInfo = ReturnType<ModuleGraph['getExportsInfo']>;

export interface RspackHarmonyImportSpecifierDependency extends Dependency {
  getIds(graph: ModuleGraph): string[];
  name: string;
  userRequest: string;
}
