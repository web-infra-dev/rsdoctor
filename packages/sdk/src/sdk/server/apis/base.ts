import { Data } from '@rsdoctor/utils/common';
import { Manifest, SDK } from '@rsdoctor/types';

const unsafeDataKeySegments = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);

function isSafeDataKeySegment(segment: string) {
  return segment.length > 0 && !unsafeDataKeySegments.has(segment);
}

function loadStoreDataByKey(data: SDK.BuilderStoreData, key: unknown) {
  if (typeof key !== 'string') {
    return undefined;
  }

  const segments = key.split('.');

  if (segments.length > 2 || !segments.every(isSafeDataKeySegment)) {
    return undefined;
  }

  return segments.reduce<unknown>((target, segment) => {
    if (!target || typeof target !== 'object' || Array.isArray(target)) {
      return undefined;
    }

    if (!Object.prototype.hasOwnProperty.call(target, segment)) {
      return undefined;
    }

    return (target as Record<string, unknown>)[segment];
  }, data);
}

export class BaseAPI implements Manifest.ManifestDataLoader {
  [key: string | symbol]: any;
  public readonly ctx!: SDK.ServerAPI.APIContext;

  protected dataLoader: Data.APIDataLoader;

  constructor(
    sdk: SDK.RsdoctorSDKInstance,
    server: SDK.RsdoctorServerInstance,
  ) {
    this.ctx = { sdk, server } as SDK.ServerAPI.APIContext;
    this.dataLoader = new Data.APIDataLoader(this);
  }

  public async loadManifest() {
    return this.ctx.sdk.getManifestData();
  }

  public async loadData<T extends Manifest.RsdoctorManifestMappingKeys>(
    key: T,
  ): Promise<Manifest.InferManifestDataValue<T>>;

  public async loadData(key: string): Promise<void>;

  public async loadData(key: string) {
    const data = this.ctx.sdk.getStoreData();
    return loadStoreDataByKey(data, key);
  }
}
