import { describe, expect, it } from '@rstest/core';
import {
  defaults,
  get,
  groupBy,
  maxBy,
  minBy,
  omitBy,
  orderBy,
  uniq,
  uniqBy,
} from './collection';

describe('collection utils', () => {
  it('handles nullish collections like es-toolkit compat helpers', () => {
    expect(uniq(undefined)).toStrictEqual([]);
    expect(uniqBy<string>(undefined, (item) => item)).toStrictEqual([]);
    expect(groupBy<string>(undefined, (item) => item)).toStrictEqual({});
    expect(minBy<number>(undefined, (item) => item)).toBeUndefined();
    expect(maxBy<number>(undefined, (item) => item)).toBeUndefined();
    expect(orderBy(undefined, ['size'], ['desc'])).toStrictEqual([]);
  });

  it('handles nullish objects and paths like es-toolkit compat helpers', () => {
    expect(get({ name: 'rsdoctor' }, undefined, 'fallback')).toBe('fallback');
    expect(get({ name: 'rsdoctor' }, '', 'fallback')).toBe('fallback');
    expect(omitBy(undefined, Boolean)).toStrictEqual({});
    expect(defaults(undefined, null, { name: 'rsdoctor' })).toStrictEqual({
      name: 'rsdoctor',
    });
  });
});
