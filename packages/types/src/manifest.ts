import { PlainObject, ObjectPropertyNames } from './common';
import { StoreData } from './sdk';

export interface RsdoctorManifest {
  client: RsdoctorManifestClient;
  /**
   * manifest url in tos, used by inner-rsdoctor.
   */
  cloudManifestUrl?: string;
  data: RsdoctorManifestData;
  /** current build name */
  name?: string;
  /**
   * multiple build info
   */
  series?: RsdoctorManifestSeriesData[];
}

export interface RsdoctorManifestSeriesData {
  name: string;
  path: string;
  stage: number;
  origin?: string;
}

export interface RsdoctorManifestWithShardingFiles
  extends Omit<RsdoctorManifest, 'data'> {
  data: Record<keyof RsdoctorManifestData, string[] | string>;
  /**
   * manifest data shareding file urls in tos, used by inner-rsdoctor.
   */
  cloudData?: Record<keyof RsdoctorManifestData, string[] | string>;
  /**
   * local server will proxy the manifest content and inject `__LOCAL__SERVER__: true`
   */
  __LOCAL__SERVER__?: boolean;
  __SOCKET__URL__?: string;
}

export interface RsdoctorManifestClient {
  enableRoutes: RsdoctorManifestClientRoutes[];
}

export interface RsdoctorManifestData extends StoreData {}

export enum RsdoctorManifestClientRoutes {
  Overall = 'Overall',
  WebpackLoaders = 'Compile.WebpackLoaders',
  ModuleResolve = 'Compile.ModuleResolve',
  WebpackPlugins = 'Compile.WebpackPlugins',
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
      [K in RsdoctorManifestObjectKeys]: RsdoctorManifestData[K] extends PlainObject
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
