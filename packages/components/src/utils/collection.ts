type PropertyKeyPath = string | number | symbol;
type PropertyPath = PropertyKeyPath | readonly PropertyKeyPath[];

const objectToString = Object.prototype.toString;

function toPath(path: PropertyPath): readonly PropertyKeyPath[] {
  if (typeof path === 'string') {
    return path
      .replace(/\[(\w+)\]/g, '.$1')
      .split('.')
      .filter(Boolean);
  }

  if (typeof path === 'number' || typeof path === 'symbol') {
    return [path];
  }

  return path;
}

export function get<T = unknown>(
  object: unknown,
  path: PropertyPath,
  defaultValue?: T,
): T | undefined {
  let result = object as Record<PropertyKey, unknown> | undefined | null;

  for (const key of toPath(path)) {
    if (result == null) {
      return defaultValue;
    }

    result = result[key] as Record<PropertyKey, unknown> | undefined | null;
  }

  return result === undefined ? defaultValue : (result as T);
}

export function sumBy<T>(
  items: readonly T[] | null | undefined,
  iteratee: (item: T) => number,
): number {
  if (!items) {
    return 0;
  }

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

export function maxBy<T>(
  items: readonly T[],
  iteratee: (item: T) => number,
): T | undefined {
  let result: T | undefined;
  let resultValue = -Infinity;

  for (const item of items) {
    const value = iteratee(item);

    if (value > resultValue) {
      result = item;
      resultValue = value;
    }
  }

  return result;
}

export function uniq<T>(items: readonly T[]): T[] {
  return Array.from(new Set(items));
}

export function uniqBy<T>(
  items: readonly T[],
  iteratee: (item: T) => unknown,
): T[] {
  const seen = new Set<unknown>();
  const result: T[] = [];

  for (const item of items) {
    const key = iteratee(item);

    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

export function groupBy<T>(
  items: readonly T[],
  iteratee: (item: T) => PropertyKey,
): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((result, item) => {
    const key = String(iteratee(item));
    result[key] ??= [];
    result[key].push(item);
    return result;
  }, {});
}

export function omitBy<T extends object>(
  object: T,
  predicate: (value: T[keyof T], key: keyof T) => boolean,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(object).filter(
      ([key, value]) => !predicate(value as T[keyof T], key as keyof T),
    ),
  ) as Partial<T>;
}

export function defaults<T extends object>(
  object: T,
  ...sources: Array<Partial<T>>
): T {
  const result = object as Record<PropertyKey, unknown>;

  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      if (result[key] === undefined) {
        result[key] = value;
      }
    }
  }

  return object;
}

export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  wait: number,
): T {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return function debounced(
    this: ThisParameterType<T>,
    ...args: Parameters<T>
  ) {
    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      fn.apply(this, args);
    }, wait);
  } as T;
}

export function orderBy<T>(
  items: readonly T[],
  paths: readonly PropertyPath[],
  orders: readonly ('asc' | 'desc')[] = [],
): T[] {
  return items.slice().sort((left, right) => {
    for (let index = 0; index < paths.length; index++) {
      const leftValue = get(left, paths[index]);
      const rightValue = get(right, paths[index]);

      if (leftValue === rightValue) {
        continue;
      }

      const direction = orders[index] === 'desc' ? -1 : 1;

      if (leftValue == null) {
        return 1;
      }

      if (rightValue == null) {
        return -1;
      }

      return leftValue > rightValue ? direction : -direction;
    }

    return 0;
  });
}

export function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const isArray = Array.isArray;

export function upperFirst(value: string): string {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

export function isEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (
    left === null ||
    right === null ||
    typeof left !== 'object' ||
    typeof right !== 'object'
  ) {
    return false;
  }

  if (objectToString.call(left) !== objectToString.call(right)) {
    return false;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return false;
    }

    return (
      left.length === right.length &&
      left.every((item, index) => isEqual(item, right[index]))
    );
  }

  const leftObject = left as Record<string, unknown>;
  const rightObject = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftObject);
  const rightKeys = Object.keys(rightObject);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(rightObject, key) &&
      isEqual(leftObject[key], rightObject[key]),
  );
}
