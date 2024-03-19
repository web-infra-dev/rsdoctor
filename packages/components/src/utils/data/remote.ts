import { Manifest, SDK } from '@rsdoctor/types';
import { Manifest as ManifestShared } from '@rsdoctor/utils/common';
import { get } from 'lodash-es';
import { BaseDataLoader } from './base';
import { fetchShardingFile } from '../request';

export class RemoteDataLoader extends BaseDataLoader {
  public isLocal() {
    return false;
  }

  public async loadData<T extends Manifest.RsdoctorManifestMappingKeys>(
    key: T,
  ): Promise<Manifest.InferManifestDataValue<T>>;

  public async loadData(key: string): Promise<unknown> {
    return this.limit(key, async () => {
      const [scope, ...rest] = this.getKeys(key);
      const data = this.getData(
        scope as keyof Manifest.RsdoctorManifestData,
        'cloudData',
      );

      if (!data) return;

      let res = data;

      // sharding files
      if (ManifestShared.isShardingData(res)) {
        // only cache by the root key in data
        if (!this.shardingDataMap.has(scope)) {
          const task = ManifestShared.fetchShardingData(
            res,
            fetchShardingFile,
          ).catch((err) => {
            this.log(`loadData error: `, res, key);
            throw err;
          });
          this.shardingDataMap.set(scope, task);
        }

        res = await this.shardingDataMap.get(scope);
      }

      return rest.length > 0 ? get(res, this.joinKeys(rest)) : res;
    });
  }

  public async loadAPI<
    T extends SDK.ServerAPI.API,
    B extends
      SDK.ServerAPI.InferRequestBodyType<T> = SDK.ServerAPI.InferRequestBodyType<T>,
    R extends
      SDK.ServerAPI.InferResponseType<T> = SDK.ServerAPI.InferResponseType<T>,
  >(...args: B extends void ? [api: T] : [api: T, body: B]): Promise<R> {
    const [api, body] = args;
    // request limitation key
    const key = body ? `${api}_${JSON.stringify(body)}` : `${api}`;

    return this.limit(key, async () => {
      return this.loader.loadAPI(...args) as R;
    });
  }

  public dispose() {
    super.dispose();
  }

  public onDataUpdate() {}

  public removeOnDataUpdate() {}
}
