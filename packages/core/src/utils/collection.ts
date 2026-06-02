import { isDeepStrictEqual } from 'node:util';

type KeyInput = PropertyKey | readonly PropertyKey[];

export function omit<T extends object>(object: T, keys: KeyInput): T {
  const omitKeys = new Set(Array.isArray(keys) ? keys : [keys]);
  const result = { ...object };

  for (const key of omitKeys) {
    delete (result as Record<PropertyKey, unknown>)[key];
  }

  return result as T;
}

export function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function pull<T>(items: T[], value: T): T[] {
  let index = items.indexOf(value);

  while (index !== -1) {
    items.splice(index, 1);
    index = items.indexOf(value);
  }

  return items;
}

export function sumBy<T>(items: readonly T[], iteratee: (item: T) => number) {
  return items.reduce((sum, item) => sum + iteratee(item), 0);
}

export function minBy<T>(
  items: readonly T[],
  iteratee: (item: T) => number,
): T | undefined {
  let result: T | undefined;
  let resultValue = Infinity;

  for (const item of items) {
    const value = iteratee(item);

    if (value < resultValue) {
      result = item;
      resultValue = value;
    }
  }

  return result;
}

export function mapValues<T, R>(
  object: Record<string, T>,
  iteratee: (value: T, key: string) => R,
): Record<string, R> {
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => [key, iteratee(value, key)]),
  );
}

export function find<T extends object>(
  items: readonly T[],
  predicate: Partial<T>,
): T | undefined {
  return items.find((item) =>
    Object.entries(predicate).every(
      ([key, value]) => item[key as keyof T] === value,
    ),
  );
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

export function lowerCase(value: string | undefined): string {
  return String(value)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .toLowerCase();
}

export const isEqual = isDeepStrictEqual;
