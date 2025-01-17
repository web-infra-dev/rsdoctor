import type { RsdoctorPluginData } from '@rspack/core';

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
