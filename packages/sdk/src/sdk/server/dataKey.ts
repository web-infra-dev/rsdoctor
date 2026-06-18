const FORBIDDEN_DATA_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getStoreDataByKey(data: object, key: string) {
  const sep = '.';
  const keys = key.split(sep);
  const root = data as Record<string, unknown>;

  if (
    keys.some((key) => FORBIDDEN_DATA_KEYS.has(key)) ||
    !Object.prototype.hasOwnProperty.call(root, keys[0])
  ) {
    throw new Error(`Invalid data key: ${key}`);
  }

  let res = root[key];

  if (key.includes(sep)) {
    res = keys.reduce<unknown>((target, key) => {
      if (
        !isRecord(target) ||
        !Object.prototype.hasOwnProperty.call(target, key)
      ) {
        throw new Error(`Invalid data key: ${keys.join(sep)}`);
      }
      return target[key];
    }, root);
  }

  return res;
}
