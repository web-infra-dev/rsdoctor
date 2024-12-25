import { Manifest, SDK } from '@rsdoctor/types';
import { Algorithm } from '@rsdoctor/utils/common';
import { BaseDataLoader } from './base';
import { Constants } from '@rsdoctor/types';

export class BriefDataLoader extends BaseDataLoader {
  public isLocal() {
    return false;
  }

  public async loadData<T extends Manifest.RsdoctorManifestMappingKeys>(
    key: T,
  ): Promise<Manifest.InferManifestDataValue<T>>;

  public async loadData(key: string): Promise<unknown> {
    console.log(`[loadData]-[key]: ${key}`);
    const [scope] = this.getKeys(key);

    console.log(`[loadData]-[scope]: ${scope}`);
    const data = this.getData(scope);

    if (!data) return;

    let res = data;

    // only cache by the root key in data
    if (!this.shardingDataMap.has(scope)) {
      const scopeData =
        typeof res === 'object'
          ? res
          : JSON.parse(Algorithm.decompressText(res));

      this.shardingDataMap.set(scope, scopeData);
    }

    res = await this.shardingDataMap.get(scope);
    return res;
  }

  public getData(scope: keyof Manifest.RsdoctorManifestData) {
    console.log(`[getData]-[scope]: ${scope}`);
    return window[Constants.WINDOW_RSDOCTOR_TAG][scope];
  }

  public async loadAPI<
    T extends SDK.ServerAPI.API,
    B extends
      SDK.ServerAPI.InferRequestBodyType<T> = SDK.ServerAPI.InferRequestBodyType<T>,
    R extends
      SDK.ServerAPI.InferResponseType<T> = SDK.ServerAPI.InferResponseType<T>,
  >(...args: B extends void ? [api: T] : [api: T, body: B]): Promise<R> {
    return this.loader.loadAPI(...args) as R;
  }

  public dispose() {
    super.dispose();
  }

  public onDataUpdate() {}

  public removeOnDataUpdate() {}
}
