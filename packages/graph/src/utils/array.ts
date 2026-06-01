type Iteratee<T> = keyof T | ((item: T) => unknown);

export function unionBy<T>(items: readonly T[], iteratee: Iteratee<T>): T[] {
  const seen = new Set<unknown>();
  const result: T[] = [];

  for (const item of items) {
    const key =
      typeof iteratee === 'function' ? iteratee(item) : item[iteratee];

    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}
