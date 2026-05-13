import { Manifest as ManifestShared } from '@rsdoctor/utils/common';
import { Common, Manifest, SDK } from '@rsdoctor/types';
import { get } from 'es-toolkit/compat';
import { BaseDataLoader } from './base';
import { postServerAPI } from '../request';
import { subscribeServerAPI, unsubscribeServerAPI } from '../socket';

export class LocalServerDataLoader extends BaseDataLoader {
  protected events: Map<string, Set<Common.Function>> = new Map();

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

    return this.limit(key, async () => {
      try {
        return (await postServerAPI(...args)) as R;
      } catch (err) {
        this.log(`loadAPI error: `, key);
        throw err;
      }
    });
  }

  public dispose() {
    super.dispose();
    this.events.forEach((evs, key) => {
      evs.forEach((ev) => {
        const [api, bodyText] = key.split('::');
        this.removeOnDataUpdate(
          api as SDK.ServerAPI.API | SDK.ServerAPI.APIExtends,
          JSON.parse(bodyText),
          ev,
        );
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
    body: SDK.ServerAPI.InferRequestBodyType<T, null> | null,
    fn: (response: SDK.ServerAPI.SocketResponseType<T>) => void,
  ) {
    const key = `${api}::${JSON.stringify(body ?? null)}`;
    if (!this.events.has(key)) {
      this.events.set(key, new Set());
    }

    if (this.events.get(key)!.has(fn)) {
      return;
    }

    this.events.get(key)!.add(fn);
    const socketPort = this.get('__SOCKET__PORT__') ?? '';
    subscribeServerAPI(api, body, fn, socketPort);
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
    unsubscribeServerAPI(api, fn, socketPort);
    this.events.get(key)?.delete(fn);
  }
}
