import type { RawSourceMap, SourceMapConsumer } from 'source-map';
import type { Configuration } from 'webpack';
import { PlainObject } from '../common';
import { EmoCheckData } from '../emo';
import {
  RsdoctorManifestClientRoutes,
  RsdoctorManifestWithShardingFiles,
} from '../manifest';
import { RuntimeContext, RuntimeContextOptions } from './context';
import { Hooks } from './hooks';
import { LoaderData, ResourceLoaderData } from './loader';
import { ModuleGraphInstance } from './module';
import { PluginData } from './plugin';
import { ResolverData } from './resolver';
import { BuilderStoreData, EMOStoreData, StoreData } from './result';
import { RsdoctorServerInstance } from './server';
import { SummaryData } from './summary';
import { BriefModeOptions } from '@/config';

export type WriteStoreOptionsType = {};

export enum IMode {
  brief = 'brief',
  lite = 'lite',
  normal = 'normal',
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

export type SDKOptionsType = {
  innerClientPath?: string;
  disableClientServer?: boolean;
  noServer?: boolean;
  printLog?: IPrintLog;
  mode?: keyof typeof IMode;
  brief?: BriefModeOptions;
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
