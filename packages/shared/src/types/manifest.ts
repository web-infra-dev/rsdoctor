import { PlainObject, ObjectPropertyNames } from './common';
import { StoreData } from './sdk';

export interface RsdoctorManifest {
  client: RsdoctorManifestClient;
  /** Optional for compatibility with artifacts produced before schema v1. */
  metadata?: RsdoctorArtifactMetadata;
  /**
   * manifest url in tos, used by inner-rsdoctor.
   */
  cloudManifestUrl?: string;
  /**
   * manifest data shareding file urls in tos, used by inner-rsdoctor.
   */
  cloudData?: Record<keyof RsdoctorManifestData, string[] | string>;
  data: RsdoctorManifestData;
  /** current build name */
  name?: string;
  /**
   * multiple build info
   */
  series?: RsdoctorManifestSeriesData[];
}

export type RsdoctorArtifactOutputMode = 'brief' | 'normal';

export type RsdoctorArtifactSectionName =
  | 'errors'
  | 'configs'
  | 'summary'
  | 'resolver'
  | 'loader'
  | 'moduleGraph'
  | 'chunkGraph'
  | 'moduleCodeMap'
  | 'plugin'
  | 'packageGraph'
  | 'treeShaking'
  | 'otherReports';

export type RsdoctorArtifactOmissionReason =
  'not-selected' | 'output-mode' | 'feature-disabled' | 'not-collected';

export type RsdoctorArtifactSectionState =
  | { status: 'collected' }
  | { status: 'omitted'; reason: RsdoctorArtifactOmissionReason };

export type RsdoctorArtifactSections = Record<
  RsdoctorArtifactSectionName,
  RsdoctorArtifactSectionState
> &
  Record<string, RsdoctorArtifactSectionState>;

export interface RsdoctorArtifactCompilationIdentity {
  compilationHash?: string;
  target?: string | string[];
  environment?: string;
}

export interface RsdoctorArtifactCompilerIdentity extends RsdoctorArtifactCompilationIdentity {
  name: string;
  stage?: number;
}

export interface RsdoctorArtifactMetadata {
  schemaVersion: 1;
  producer: {
    name: '@rsdoctor/core';
    version: string;
  };
  output: {
    mode: RsdoctorArtifactOutputMode;
  };
  build: RsdoctorArtifactCompilationIdentity & {
    /** Existing Rsdoctor SDK/build identifier; not a compilation hash. */
    id: string;
    root: string;
    compiler: {
      name: string;
      type?: string;
      version?: string;
    };
    compilers?: RsdoctorArtifactCompilerIdentity[];
  };
  sections: RsdoctorArtifactSections;
}

export interface RsdoctorBriefArtifact {
  data: RsdoctorManifestData;
  clientRoutes: RsdoctorManifestClientRoutes[];
  /** Optional for compatibility with artifacts produced before schema v1. */
  metadata?: RsdoctorArtifactMetadata;
}

export interface RsdoctorManifestSeriesData {
  name: string;
  displayName?: string;
  path: string;
  stage: number;
  origin?: string;
  compilerPath?: string;
  parentCompilerPath?: string;
  isChild?: boolean;
}

export interface RsdoctorManifestWithShardingFiles extends Omit<
  RsdoctorManifest,
  'data'
> {
  data: Record<keyof RsdoctorManifestData, string[] | string>;
  /**
   * manifest data shareding file urls in tos, used by inner-rsdoctor.
   */
  cloudData?: Record<keyof RsdoctorManifestData, string[] | string>;
  /**
   * local server will proxy the manifest content and inject `__LOCAL__SERVER__: true`
   */
  __LOCAL__SERVER__?: boolean;
  __SOCKET__PORT__?: string;
  __SOCKET__URL__?: string;
}

export interface RsdoctorManifestClient {
  enableRoutes: RsdoctorManifestClientRoutes[];
}

// rslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RsdoctorManifestData extends StoreData {}

export enum RsdoctorManifestClientRoutes {
  Overall = 'Overall',
  Loaders = 'Compile.Loaders',
  ModuleResolve = 'Compile.ModuleResolve',
  Plugins = 'Compile.Plugins',
  BundleSize = 'Bundle.BundleSize',
  ModuleGraph = 'Bundle.ModuleGraph',
  TreeShaking = 'Bundle.TreeShaking',
}

export enum RsdoctorManifestClientConstant {
  WindowPropertyForManifestUrl = '__DEVTOOLS_MANIFEST_URL__',
}

export type RsdoctorManifestObjectKeys = NonNullable<
  ObjectPropertyNames<RsdoctorManifestData>
>;

export type RsdoctorManifestRootKeys = keyof RsdoctorManifestData;

export type RsdoctorManifestMappingKeys =
  | {
      [
        K in RsdoctorManifestObjectKeys
      ]: RsdoctorManifestData[K] extends PlainObject
        ? RsdoctorManifestData[K] extends Array<unknown>
          ? never
          : string extends keyof RsdoctorManifestData[K]
            ? never
            : keyof RsdoctorManifestData[K] extends string
              ? `${K}.${keyof RsdoctorManifestData[K]}`
              : never
        : never;
    }[RsdoctorManifestObjectKeys]
  | RsdoctorManifestRootKeys;

export type InferManifestDataValue<T> =
  T extends `${infer Scope}.${infer Child}`
    ? Scope extends RsdoctorManifestObjectKeys
      ? Child extends keyof RsdoctorManifestData[Scope]
        ? RsdoctorManifestData[Scope][Child]
        : never
      : never
    : T extends RsdoctorManifestRootKeys
      ? RsdoctorManifestData[T]
      : never;

export interface ManifestDataLoader {
  loadManifest(): Promise<RsdoctorManifest | RsdoctorManifestWithShardingFiles>;
  loadData: {
    <T extends RsdoctorManifestMappingKeys>(
      key: T,
    ): Promise<void | InferManifestDataValue<T>>;
  };
}
