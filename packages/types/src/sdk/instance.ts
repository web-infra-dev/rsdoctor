import type { Configuration } from 'webpack';
import type { SourceMapConsumer, RawSourceMap } from 'source-map';

import { LoaderData, ResourceLoaderData } from './loader';
import { ResolverData } from './resolver';
import { PluginData } from './plugin';
import { BuilderStoreData, EMOStoreData, StoreData } from './result';
import { ModuleGraphInstance } from './module';
import {
  RsdoctorManifestClientRoutes,
  RsdoctorManifestWithShardingFiles,
} from '../manifest';
import { SummaryData } from './summary';
import { RuntimeContext, RuntimeContextOptions } from './context';
import { RsdoctorServerInstance } from './server';
import { PlainObject } from '../common';
import { EmoCheckData } from '../emo';
import { Hooks } from './hooks';

export type WriteStoreOptionsType = {};

export enum IMode {
  brief,
  lite,
  normal,
}

export interface RsdoctorBuilderSDKInstance extends RsdoctorSDKInstance {
  readonly server: RsdoctorServerInstance;
  /** Report configuration information */
  reportConfiguration(config: Configuration): void;
  /** Report error message */
  reportError(errors: Error[]): void;
  /** Report error message */
  reportLoader(data: LoaderData): void;
  /** Report loader message before or after some builtin loader */
  reportLoaderStartOrEnd(data: ResourceLoaderData): void;
  /** Report path request information */
  reportResolver(data: ResolverData): void;
  /** Report plugin information */
  reportPlugin(data: PluginData): void;
  /** Report module chart data */
  reportModuleGraph(data: ModuleGraphInstance): void;
  /** report the data of summary */
  reportSummaryData(part: Partial<SummaryData>): void;
  /** Report sourceMap data */
  reportSourceMap(data: RawSourceMap): void;
  /** report tile graph like webpack bundle analyzer data */
  reportTileHtml(data: string): void;

  getClientRoutes(): RsdoctorManifestClientRoutes[];
  addClientRoutes(routes: RsdoctorManifestClientRoutes[]): void;

  /** Application error modification */
  applyErrorFix(id: number): Promise<void>;
  /** Get build result data */
  getStoreData(): BuilderStoreData;
  /** Get build resource entry file */
  getManifestData(): RsdoctorManifestWithShardingFiles;
  /** Get rule context */
  getRuleContext(options: RuntimeContextOptions): RuntimeContext;
  /** Get SourceMap from cache */
  getSourceMap(file: string): Promise<SourceMapConsumer | undefined>;
  /** clear cache */
  clearSourceMapCache(): void;
  /** Clear all data */
  clear(): void;
}

export interface RsdoctorEMOSDKInstance extends RsdoctorSDKInstance {
  reportEmoData(data: EmoCheckData): void;
  getStoreData(): EMOStoreData;
}

export interface RsdoctorSDKInstance {
  readonly name: string;
  readonly root: string;
  readonly extraConfig: SDKOptionsType | undefined;
  readonly hooks: Hooks;

  /**
   * folder of manifest
   *   - used to save the manifest.json and sharding files.
   * @default ".rsdoctor"
   */
  readonly outputDir: string;

  /** manifest local path */
  diskManifestPath: string;

  /** start */
  bootstrap(): Promise<void>;
  dispose(): Promise<void>;

  /** Change output path */
  setOutputDir(outputDir: string): void;

  /** Change build name */
  setName(name: string): void;
  setHash(hash: string): void;
  getHash(): string;

  /**
   * write the manifest to a folder
   *   - use this.outputDir
   * @returns the absolute path of manifest.json.
   */
  saveManifest(
    storeData: PlainObject,
    options: WriteStoreOptionsType,
  ): Promise<string>;
}

export interface IPrintLog {
  serverUrls: boolean;
}

export interface BriefConfig {
  reportHtmlName?: string | undefined;
  writeDataJson: boolean;
}

export type SDKOptionsType = {
  disableTOSUpload: boolean;
  innerClientPath?: string;
  disableClientServer?: boolean;
  noServer?: boolean;
  printLog?: IPrintLog;
  mode?: keyof typeof IMode;
  brief?: BriefConfig;
};

/**
 * @deprecated
 */
export interface RsdoctorSdkInstance {
  readonly name: string;
  readonly root: string;
  readonly server: RsdoctorServerInstance;

  /**
   * folder of manifest
   *   - used to save the manifest.json and sharding files.
   * @default ".rsdoctor"
   */
  readonly outputDir: string;

  /** manifest local path */
  diskManifestPath: string;

  /** start */
  bootstrap(): Promise<void>;

  /** Close */
  dispose(): Promise<void>;

  /** Clear all data */
  clear(): void;

  /** Change output path */
  setOutputDir(outputDir: string): void;

  /** Change build name */
  setName(name: string): void;

  /** Report configuration information */
  reportConfiguration(config: Configuration): void;

  /** Report error message */
  reportError(errors: Error[]): void;

  /** Report error message */
  reportLoader(data: LoaderData): void;

  /** Report path request information */
  reportResolver(data: ResolverData): void;

  /** Report plugin information */
  reportPlugin(data: PluginData): void;

  /** Report module chart data */
  reportModuleGraph(data: ModuleGraphInstance): void;
  /** report the data of summary */
  reportSummaryData(part: Partial<SummaryData>): void;

  /** Report sourceMap data */
  reportSourceMap(data: RawSourceMap): void;

  getClientRoutes(): RsdoctorManifestClientRoutes[];
  addClientRoutes(routes: RsdoctorManifestClientRoutes[]): void;

  /**
   * write the manifest to a folder
   *   - use this.outputDir
   * @returns the absolute path of manifest.json.
   */
  writeStore(options?: WriteStoreOptionsType): Promise<string>;

  /** Application error modification */
  applyErrorFix(id: number): Promise<void>;

  /** Get build result data */
  getStoreData(): StoreData;

  /** Get build resource entry file */
  getManifestData(): RsdoctorManifestWithShardingFiles;

  /** Get rule context */
  getRuleContext(options: RuntimeContextOptions): RuntimeContext;

  /** Get SourceMap from cache */
  getSourceMap(file: string): Promise<SourceMapConsumer | undefined>;

  /** clear cache */
  clearSourceMapCache(): void;
}
