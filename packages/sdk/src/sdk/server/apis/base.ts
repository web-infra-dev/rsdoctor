import { Data } from '@rsdoctor/utils/common';
import { Manifest, SDK } from '@rsdoctor/types';

export class BaseAPI implements Manifest.ManifestDataLoader {
  [key: string | symbol]: any;
  public readonly ctx!: SDK.ServerAPI.APIContext;

  protected dataLoader: Data.APIDataLoader;

  constructor(sdk: SDK.RsdoctorSDKInstance, server: SDK.RsdoctorServerInstance) {
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

    let res = data[key];

    if (key.includes(sep)) {
      res = key.split(sep).reduce((t, k) => t[k], data);
    }

    return res;
  }
}
