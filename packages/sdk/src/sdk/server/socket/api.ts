import { Data } from '@rsdoctor/utils/common';
import { Manifest, SDK } from '@rsdoctor/types';

interface SocketAPILoaderOptions {
  sdk: SDK.RsdoctorBuilderSDKInstance;
}

export class SocketAPILoader implements Manifest.ManifestDataLoader {
  protected dataLoader: Data.APIDataLoader;

  constructor(protected options: SocketAPILoaderOptions) {
    this.dataLoader = new Data.APIDataLoader(this);
  }

  public async loadManifest() {
    return this.options.sdk.getManifestData();
  }

  public async loadData<T extends Manifest.RsdoctorManifestMappingKeys>(
    key: T,
  ): Promise<Manifest.InferManifestDataValue<T>>;

  public async loadData(key: string): Promise<void>;

  public async loadData(key: string) {
    const data = this.options.sdk.getStoreData();

    const sep = '.';

    let res = data[key];

    if (key.includes(sep)) {
      res = key.split(sep).reduce((t, k) => t[k], data);
    }

    return res;
  }

  get loadAPIData() {
    return this.dataLoader.loadAPI;
  }
}
