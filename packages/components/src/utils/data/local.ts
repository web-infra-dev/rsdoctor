import { Manifest as ManifestShared } from '@rsdoctor/utils/common';
import { Common, Manifest, SDK } from '@rsdoctor/types';
import { get } from 'lodash-es';
import { BaseDataLoader } from './base';
import { getSocket } from '../socket';

export class LocalServerDataLoader extends BaseDataLoader {
  protected events: Map<
    SDK.ServerAPI.API | SDK.ServerAPI.APIExtends,
    Set<Common.Function>
  > = new Map();

  public isLocal() {
    return true;
  }

  public async loadData<T extends keyof Manifest.RsdoctorManifestData>(
    key: T,
  ): Promise<void | Manifest.RsdoctorManifestData[T]>;

  public async loadData(key: string): Promise<unknown> {
    return this.limit(key, async () => {
      const [scope, ...rest] = this.getKeys(key);
      const data = this.getData(scope as keyof Manifest.RsdoctorManifestData);

      if (!data) return;

      let res: unknown = data;

      // sharding files
      if (ManifestShared.isShardingData(res)) {
        if (!this.shardingDataMap.has(key)) {
          const task = new Promise((resolve) => {
            getSocket().emit(
              SDK.ServerAPI.API.LoadDataByKey,
              { key },
              (
                res: SDK.ServerAPI.SocketResponseType<SDK.ServerAPI.API.LoadDataByKey>,
              ) => {
                resolve(res.res);
              },
            );
          });
          // const task = postServerAPI(SDK.ServerAPI.API.LoadDataByKey, { key }).catch((err) => {
          //   this.log(`loadData error: `, res, key);
          //   throw err;
          // });
          // save with every key
          this.shardingDataMap.set(key, task);
        }

        res = await this.shardingDataMap.get(key);
        this.shardingDataMap.delete(key);
        return res;
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
    const socketUrl = this.get('__SOCKET__URL__') ?? ''
    
    return this.limit(key, async () => {
      return new Promise((resolve) => {
        getSocket(socketUrl).emit(
          api,
          body,
          (res: SDK.ServerAPI.SocketResponseType<T>) => {
            resolve(res.res as R);
          },
        );
      });
      // const res = await postServerAPI(...args).catch((err) => {
      //   this.log(`loadAPI error: `, key);
      //   throw err;
      // });

      // return res as R;
    });
  }

  public dispose() {
    super.dispose();
    this.events.forEach((evs, api) => {
      evs.forEach((ev) => {
        this.removeOnDataUpdate(api, ev);
      });
      evs.clear();
    });
    this.events.clear();
  }

  /**
   * add event listener when received data from server.
   */
  public onDataUpdate<T extends SDK.ServerAPI.API | SDK.ServerAPI.APIExtends>(
    api: T,
    fn: (response: SDK.ServerAPI.SocketResponseType<T>) => void,
  ) {
    if (!this.events.has(api)) {
      this.events.set(api, new Set());
    }

    if (this.events.get(api)!.has(fn)) {
      return;
    }

    this.events.get(api)!.add(fn);
    getSocket().on(api as string, fn);
  }

  public removeOnDataUpdate<
    T extends SDK.ServerAPI.API | SDK.ServerAPI.APIExtends,
  >(api: T, fn: (response: SDK.ServerAPI.SocketResponseType<T>) => void) {
    getSocket().off(api as string, fn);
    this.events.get(api)!.delete(fn);
  }
}
