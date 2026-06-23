import { Data } from '@rsdoctor/utils/common';
import { Manifest, SDK } from '@rsdoctor/types';

const FORBIDDEN_DATA_PATH_SEGMENTS = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);
const DATA_PATH_SEPARATOR = '.';
const MAX_DATA_PATH_DEPTH = 2;

function getOwnPathValue(data: unknown, key: string) {
  const segments = key.split(DATA_PATH_SEPARATOR);

  if (
    segments.length > MAX_DATA_PATH_DEPTH ||
    segments.some((segment) => !segment)
  ) {
    return undefined;
  }

  let current = data;

  for (const segment of segments) {
    if (FORBIDDEN_DATA_PATH_SEGMENTS.has(segment)) {
      return undefined;
    }

    if (
      current === null ||
      typeof current !== 'object' ||
      !Object.prototype.hasOwnProperty.call(current, segment)
    ) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

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

  public async loadData(key: string) {
    const data = this.ctx.sdk.getStoreData();

    return getOwnPathValue(data, key);
  }
}
