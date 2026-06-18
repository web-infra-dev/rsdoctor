import { Data } from '@rsdoctor/utils/common';
import { Manifest, SDK } from '@rsdoctor/types';
import { getStoreDataByKey } from '../dataKey';

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

    return getStoreDataByKey(data, key);
  }

  get loadAPIData() {
    return this.dataLoader.loadAPI as <
      T extends SDK.ServerAPI.API | SDK.ServerAPI.APIExtends,
    >(
      api: T,
      body: SDK.ServerAPI.InferRequestBodyType<T>,
    ) => Promise<SDK.ServerAPI.InferResponseType<T>>;
  }
}
