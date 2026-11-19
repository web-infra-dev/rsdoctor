import { Manifest, SDK } from '@rsdoctor/shared/types';
import { Algorithm } from '@rsdoctor/shared/common-browser';
import { BaseDataLoader } from './base';

export class BriefDataLoader extends BaseDataLoader {
  private static readonly loaders = new WeakMap<object, BriefDataLoader>();

  private constructor(private readonly report: Record<string, unknown>) {
    super({ data: [] } as any);
  }

  static forReport(report: Record<string, unknown>): BriefDataLoader {
    let loader = this.loaders.get(report);
    if (!loader) {
      loader = new BriefDataLoader(report);
      this.loaders.set(report, loader);
    }
    return loader;
  }

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
    const data = this.report[scope];

    if (!data) return;

    let res = data;

    // only cache by the root key in data
    if (!this.shardingDataMap.has(scope)) {
      const scopeData = this.parseData(res);

      this.shardingDataMap.set(scope, Promise.resolve(scopeData));
    }

    res = await this.shardingDataMap.get(scope);
    return res;
  }

  private parseData(data: unknown): unknown {
    if (typeof data === 'object' && data !== null) {
      return data;
    }

    if (typeof data !== 'string') {
      return data;
    }

    try {
      return JSON.parse(Algorithm.decompressText(data));
    } catch {
      return data;
    }
  }

  public async loadAPI<
    T extends SDK.ServerAPI.API,
    B extends SDK.ServerAPI.InferRequestBodyType<T> =
      SDK.ServerAPI.InferRequestBodyType<T>,
    R extends SDK.ServerAPI.InferResponseType<T> =
      SDK.ServerAPI.InferResponseType<T>,
  >(...args: B extends void ? [api: T] : [api: T, body: B]): Promise<R> {
    if (args[0] === SDK.ServerAPI.API.GetClientRoutes) {
      return (this.report.enableRoutes ?? []) as R;
    }
    return this.loader.loadAPI(...args) as R;
  }

  public dispose() {
    super.dispose();
  }

  public onDataUpdate() {}

  public removeOnDataUpdate() {}
}
