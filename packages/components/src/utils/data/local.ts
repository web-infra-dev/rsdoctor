import { Manifest as ManifestShared } from '@rsdoctor/core/common-browser';
import { Common, Manifest, SDK } from '@rsdoctor/types';
import { get } from '@rsdoctor/core/collection';
import { BaseDataLoader } from './base';
import { postServerAPI } from '../request';
import {
  requestServerAPI,
  subscribeServerAPI,
  unsubscribeServerAPI,
} from '../socket';

type DataUpdateAPI = SDK.ServerAPI.API | SDK.ServerAPI.APIExtends;

type DataUpdateSubscription = {
  api: DataUpdateAPI;
  body: SDK.ServerAPI.InferRequestBodyType<DataUpdateAPI, null> | null;
  listeners: Set<Common.Function>;
};

export class LocalServerDataLoader extends BaseDataLoader {
  protected events: Map<string, DataUpdateSubscription> = new Map();

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
          const task = postServerAPI(SDK.ServerAPI.API.LoadDataByKey, {
            key,
          }).catch((err) => {
            this.log(`loadData error: `, res, key);
            throw err;
          });
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
    B extends SDK.ServerAPI.InferRequestBodyType<T> =
      SDK.ServerAPI.InferRequestBodyType<T>,
    R extends SDK.ServerAPI.InferResponseType<T> =
      SDK.ServerAPI.InferResponseType<T>,
  >(...args: B extends void ? [api: T] : [api: T, body: B]): Promise<R> {
    const [api, body] = args;
    // request limitation key
    const key = body ? `${api}_${JSON.stringify(body)}` : `${api}`;
    const socketPort = this.get('__SOCKET__PORT__') ?? '';
    const socketUrl = this.get('__SOCKET__URL__') ?? '';

    return this.limit(key, async () => {
      try {
        return (await requestServerAPI(
          api,
          body as SDK.ServerAPI.InferRequestBodyType<T>,
          socketPort,
          socketUrl,
        )) as R;
      } catch (err) {
        this.log(`loadAPI error: `, key);
        throw err;
      }
    });
  }

  public dispose() {
    super.dispose();
    this.events.forEach(({ api, body, listeners }) => {
      listeners.forEach((listener) => {
        this.removeOnDataUpdate(api, body, listener);
      });
      listeners.clear();
    });
    this.events.clear();
  }

  /**
   * add event listener when received data from server.
   */
  public onDataUpdate<T extends SDK.ServerAPI.API | SDK.ServerAPI.APIExtends>(
    api: T,
    body: SDK.ServerAPI.InferRequestBodyType<T, null> | null,
    fn: (response: SDK.ServerAPI.SocketResponseType<T>) => void,
  ) {
    const normalizedBody = body ?? null;
    const key = `${api}::${JSON.stringify(normalizedBody)}`;
    if (!this.events.has(key)) {
      this.events.set(key, {
        api,
        body: normalizedBody,
        listeners: new Set(),
      });
    }

    const subscription = this.events.get(key)!;
    if (subscription.listeners.has(fn)) {
      return;
    }

    subscription.listeners.add(fn);
    const socketPort = this.get('__SOCKET__PORT__') ?? '';
    const socketUrl = this.get('__SOCKET__URL__') ?? '';
    subscribeServerAPI(api, normalizedBody, fn, socketPort, socketUrl);
  }

  public removeOnDataUpdate<
    T extends SDK.ServerAPI.API | SDK.ServerAPI.APIExtends,
  >(
    api: T,
    body: SDK.ServerAPI.InferRequestBodyType<T, null> | null,
    fn: (response: SDK.ServerAPI.SocketResponseType<T>) => void,
  ) {
    const key = `${api}::${JSON.stringify(body ?? null)}`;
    const socketPort = this.get('__SOCKET__PORT__') ?? '';
    const socketUrl = this.get('__SOCKET__URL__') ?? '';
    unsubscribeServerAPI(api, body, fn, socketPort, socketUrl);
    this.events.get(key)?.listeners.delete(fn);
  }
}
