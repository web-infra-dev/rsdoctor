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
