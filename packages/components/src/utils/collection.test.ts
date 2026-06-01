import { describe, expect, it } from '@rstest/core';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  defaults,
  get,
  groupBy,
  maxBy,
  minBy,
  omitBy,
  orderBy,
  throttle,
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

  it('throttles calls and keeps the latest trailing arguments', async () => {
    const calls: string[] = [];
    const throttled = throttle((value: string) => {
      calls.push(value);
    }, 20);

    throttled('first');
    throttled('second');
    throttled('third');

    expect(calls).toStrictEqual(['first']);

    await sleep(40);

    expect(calls).toStrictEqual(['first', 'third']);
  });

  it('cancels pending throttled calls', async () => {
    const calls: string[] = [];
    const throttled = throttle((value: string) => {
      calls.push(value);
    }, 20);

    throttled('first');
    throttled('second');
    throttled.cancel();

    await sleep(40);

    expect(calls).toStrictEqual(['first']);

    throttled('third');

    expect(calls).toStrictEqual(['first', 'third']);
  });
});
