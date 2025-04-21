// Replace lodash's isUndefined function
export function isUndefined(value: unknown): value is undefined {
  return typeof value === 'undefined';
}

// Replace lodash's isNumber function
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// Replace lodash's isEmpty function
export function isEmpty(value: unknown): boolean {
  return (
    value == null || // Check for null or undefined
    (Array.isArray(value) && value.length === 0) || // Check for empty array
    (typeof value === 'object' && Object.keys(value).length === 0) // Check for empty object
  );
}

// Replace lodash's last function
export function last<T>(array: T[]): T | undefined {
  return array[array.length - 1];
}

// Replace lodash's compact function
export function compact<T>(array: (T | null | undefined)[]): T[] {
  return array.filter((item): item is T => item != null || !item); // Filter out null and undefined
}

// Replace lodash's isNil function
export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

// Replace lodash's isPlainObject function
export const isPlainObject = (obj: unknown): obj is Record<string, any> => {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    Object.getPrototypeOf(obj) === Object.prototype
  );
};

// Replace lodash's isString function
export const isString = (v: unknown): v is string =>
  typeof v === 'string' ||
  (!!v &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    {}.toString.call(v) === '[object String]');

// Replace lodash's pick function
export function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (Object.hasOwn(obj, key)) {
      result[key] = obj[key];
    }
  }
  return result;
}
