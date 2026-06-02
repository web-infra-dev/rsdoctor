import {
  debounce as esDebounce,
  defaults as esDefaults,
  escape as esEscape,
  escapeRegExp as esEscapeRegExp,
  find as esFind,
  get as esGet,
  groupBy as esGroupBy,
  isArray as esIsArray,
  isEqual as esIsEqual,
  isNumber as esIsNumber,
  lowerCase as esLowerCase,
  mapValues as esMapValues,
  maxBy as esMaxBy,
  minBy as esMinBy,
  omit as esOmit,
  omitBy as esOmitBy,
  orderBy as esOrderBy,
  pull as esPull,
  snakeCase as esSnakeCase,
  sumBy as esSumBy,
  throttle as esThrottle,
  unionBy as esUnionBy,
  uniq as esUniq,
  uniqBy as esUniqBy,
  upperFirst as esUpperFirst,
} from 'es-toolkit/compat';

type AnyFunction = (...args: any[]) => any;
type CollectionKey = string | number | symbol;
type CollectionPath = CollectionKey | readonly CollectionKey[];
type CollectionIteratee<T, TResult = unknown> =
  | ((value: T, index: number, collection: readonly T[]) => TResult)
  | CollectionPath
  | Partial<T>;
type ObjectIteratee<T extends object, TResult = unknown> = (
  value: T[keyof T],
  key: keyof T,
  object: T,
) => TResult;

export interface DebounceSettings {
  leading?: boolean;
  maxWait?: number;
  trailing?: boolean;
}

export interface DebounceSettingsLeading extends DebounceSettings {
  leading: true;
}

export interface DebouncedFunc<T extends AnyFunction> {
  (...args: Parameters<T>): ReturnType<T> | undefined;
  cancel(): void;
  flush(): ReturnType<T> | undefined;
}

export interface DebouncedFuncLeading<
  T extends AnyFunction,
> extends DebouncedFunc<T> {
  (...args: Parameters<T>): ReturnType<T>;
  flush(): ReturnType<T>;
}

export interface ThrottleSettings {
  leading?: boolean;
  trailing?: boolean;
}

export type SortOrder = 'asc' | 'desc';

export interface Debounce {
  <T extends AnyFunction>(
    func: T,
    wait: number | undefined,
    options: DebounceSettingsLeading,
  ): DebouncedFuncLeading<T>;
  <T extends AnyFunction>(
    func: T,
    wait?: number,
    options?: DebounceSettings,
  ): DebouncedFunc<T>;
}

export interface Throttle {
  <T extends AnyFunction>(
    func: T,
    wait?: number,
    options?: ThrottleSettings,
  ): DebouncedFunc<T>;
}

export interface Get {
  <TObject extends object, TKey extends keyof TObject>(
    object: TObject,
    path: TKey | readonly [TKey],
  ): TObject[TKey];
  <TObject extends object, TKey extends keyof TObject, TDefault>(
    object: TObject | null | undefined,
    path: TKey | readonly [TKey],
    defaultValue: TDefault,
  ): Exclude<TObject[TKey], undefined> | TDefault;
  <TDefault = any>(
    object: unknown,
    path: CollectionPath,
    defaultValue?: TDefault,
  ): any;
}

export const debounce = esDebounce as Debounce;
export const defaults = esDefaults as <T extends object, U extends object>(
  object: T,
  ...sources: U[]
) => T & U;
export const escape = esEscape as (value?: string | null) => string;
export const escapeRegExp = esEscapeRegExp as (value?: string | null) => string;
export const find = esFind as {
  <T, U extends T>(
    collection: ArrayLike<T> | null | undefined,
    predicate: (
      value: T,
      index: number,
      collection: ArrayLike<T>,
    ) => value is U,
    fromIndex?: number,
  ): U | undefined;
  <T>(
    collection: ArrayLike<T> | null | undefined,
    predicate?: CollectionIteratee<T, boolean>,
    fromIndex?: number,
  ): T | undefined;
  <T extends object>(
    collection: T | null | undefined,
    predicate?:
      | ObjectIteratee<T, boolean>
      | Partial<T[keyof T]>
      | CollectionPath,
    fromIndex?: number,
  ): T[keyof T] | undefined;
};
export const get = esGet as Get;
export const groupBy = esGroupBy as <T>(
  collection: readonly T[] | null | undefined,
  iteratee: CollectionIteratee<T, CollectionKey>,
) => Record<string, T[]>;
export const isArray = esIsArray as <T = any>(value?: unknown) => value is T[];
export const isEqual = esIsEqual as (value: unknown, other: unknown) => boolean;
export const isNumber = esIsNumber as (value?: unknown) => value is number;
export const lowerCase = esLowerCase as (value?: string | null) => string;
export const mapValues = esMapValues as <T extends object, TResult>(
  object: T | null | undefined,
  iteratee: ObjectIteratee<T, TResult>,
) => { [K in keyof T]: TResult };
export const maxBy = esMaxBy as <T>(
  collection: readonly T[] | null | undefined,
  iteratee: CollectionIteratee<T>,
) => T | undefined;
export const minBy = esMinBy as <T>(
  collection: readonly T[] | null | undefined,
  iteratee: CollectionIteratee<T>,
) => T | undefined;
export const omit = esOmit as <T extends object>(
  object: T | null | undefined,
  paths: CollectionPath | readonly CollectionPath[],
) => T;
export const omitBy = esOmitBy as <T extends object>(
  object: T | null | undefined,
  predicate: ObjectIteratee<T, boolean>,
) => Partial<T>;
export const orderBy = esOrderBy as <T>(
  collection: readonly T[] | null | undefined,
  iteratees?: CollectionIteratee<T> | readonly CollectionIteratee<T>[],
  orders?: SortOrder | readonly SortOrder[],
) => T[];
export const pull = esPull as <T>(array: T[], ...values: T[]) => T[];
export const snakeCase = esSnakeCase as (value?: string | null) => string;
export const sumBy = esSumBy as <T>(
  collection: readonly T[] | null | undefined,
  iteratee: CollectionIteratee<T, number>,
) => number;
export const throttle = esThrottle as Throttle;
export const unionBy = esUnionBy as <T>(
  collection: readonly T[] | null | undefined,
  ...valuesOrIteratee: Array<readonly T[] | CollectionIteratee<T>>
) => T[];
export const uniq = esUniq as <T>(
  array: readonly T[] | null | undefined,
) => T[];
export const uniqBy = esUniqBy as <T>(
  array: readonly T[] | null | undefined,
  iteratee: CollectionIteratee<T>,
) => T[];
export const upperFirst = esUpperFirst as (value?: string | null) => string;
