import { Manifest } from '@rsdoctor/types';

const FORBIDDEN_DATA_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function loadStoreDataByKey<
  T extends Manifest.RsdoctorManifestMappingKeys,
>(
  data: Manifest.RsdoctorManifestData,
  key: T,
): Manifest.InferManifestDataValue<T>;

export function loadStoreDataByKey(
  data: Manifest.RsdoctorManifestData,
  key: string,
): unknown;

export function loadStoreDataByKey(
  data: Manifest.RsdoctorManifestData,
  key: string,
) {
  const sep = '.';
  const keys = key.split(sep);
  if (
    keys.some((part) => FORBIDDEN_DATA_KEYS.has(part)) ||
    !Object.prototype.hasOwnProperty.call(data, keys[0])
  ) {
    throw new Error(`Invalid data key: ${key}`);
  }

  let res: unknown = data[key as keyof Manifest.RsdoctorManifestData];

  if (key.includes(sep)) {
    res = keys.reduce<unknown>((target, part) => {
      if (
        target === null ||
        typeof target !== 'object' ||
        !Object.prototype.hasOwnProperty.call(target, part)
      ) {
        throw new Error(`Invalid data key: ${keys.join(sep)}`);
      }
      return (target as Record<string, unknown>)[part];
    }, data);
  }

  return res;
}
