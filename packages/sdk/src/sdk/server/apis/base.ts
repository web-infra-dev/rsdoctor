import { Data } from '@rsdoctor/utils/common';
import { Manifest, SDK } from '@rsdoctor/types';

const FORBIDDEN_DATA_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

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

  public async loadData(key: Manifest.RsdoctorManifestObjectKeys) {
    const data = this.ctx.sdk.getStoreData();

    const sep = '.';
    const keys = key.split(sep);
    if (
      keys.some((key) => FORBIDDEN_DATA_KEYS.has(key)) ||
      !Object.prototype.hasOwnProperty.call(data, keys[0])
    ) {
      throw new Error(`Invalid data key: ${key}`);
    }

    let res = data[key];

    if (key.includes(sep)) {
      res = keys.reduce((target, key) => {
        if (
          target === null ||
          typeof target !== 'object' ||
          !Object.prototype.hasOwnProperty.call(target, key)
        ) {
          throw new Error(`Invalid data key: ${keys.join(sep)}`);
        }
        return target[key];
      }, data);
    }

    return res;
  }
}
