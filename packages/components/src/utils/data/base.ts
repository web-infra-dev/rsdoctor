import { Common, Manifest, SDK } from '@rsdoctor/types';
import { Data } from '@rsdoctor/utils/common';

export abstract class BaseDataLoader implements Manifest.ManifestDataLoader {
  protected pool = new Map<string, Promise<unknown>>();

  protected loader: Data.APIDataLoader;

  protected disposed = false;

  protected shardingDataMap = new Map<
    keyof Manifest.DoctorManifestData | string,
    Promise<Manifest.DoctorManifestData[keyof Manifest.DoctorManifestData]>
  >();

  constructor(protected manifest: Manifest.DoctorManifestWithShardingFiles) {
    this.loader = new Data.APIDataLoader(this);
    console.log('[DataLoader] isLocal: ', this.isLocal());
  }

  protected get<T extends keyof Manifest.DoctorManifestWithShardingFiles>(
    key: T,
  ): void | Manifest.DoctorManifestWithShardingFiles[T] {
    if (!this.manifest) return;
    return this.manifest[key];
  }

  protected getData<T extends keyof Manifest.DoctorManifestData>(
    key: T,
    scope: 'data' = 'data',
  ): void | Manifest.DoctorManifestWithShardingFiles['data'][T] {
    const data = this.get(scope);
    if (!data) return;
    return data[key];
  }

  protected getKeys(key: string) {
    return key.split('.');
  }

  protected joinKeys(keys: string[]) {
    return keys.join('.');
  }

  public dispose() {
    this.disposed = true;
  }

  public limit<T>(key: string, fn: Common.Function<unknown[], Promise<T>>): Promise<T> {
    if (this.pool.has(key)) {
      return this.pool.get(key) as Promise<T>;
    }
    const res = fn().finally(() => this.pool.delete(key));
    this.pool.set(key, res);
    return res;
  }

  public log(...args: unknown[]) {
    console.log(`[${this.constructor.name}]`, ...args);
  }

  public async loadManifest() {
    return this.manifest;
  }

  abstract loadData<T extends string, P>(key: T): Promise<void | P>;

  abstract loadData<T extends Manifest.DoctorManifestMappingKeys>(
    key: T,
  ): Promise<void | Manifest.InferManifestDataValue<T>>;

  abstract isLocal(): boolean;

  abstract loadAPI<
    T extends SDK.ServerAPI.API,
    B extends SDK.ServerAPI.InferRequestBodyType<T> = SDK.ServerAPI.InferRequestBodyType<T>,
    R extends SDK.ServerAPI.InferResponseType<T> = SDK.ServerAPI.InferResponseType<T>,
  >(...args: B extends void ? [api: T] : [api: T, body: B]): Promise<R>;

  public abstract onDataUpdate<T extends SDK.ServerAPI.API | SDK.ServerAPI.APIExtends>(
    api: T,
    fn: (response: SDK.ServerAPI.SocketResponseType<T>) => void,
  ): void;

  public abstract removeOnDataUpdate<T extends SDK.ServerAPI.API | SDK.ServerAPI.APIExtends>(
    api: T,
    fn: (response: SDK.ServerAPI.SocketResponseType<T>) => void,
  ): void;
}
