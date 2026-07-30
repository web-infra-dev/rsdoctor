import { describe, expect, it } from '@rstest/core';
import { Lodash } from '../src/common-browser';

describe('compact', () => {
  it('removes falsy values', () => {
    expect(
      Lodash.compact([false, null, 0, '', undefined, Number.NaN, 'value', 1]),
    ).toEqual(['value', 1]);
  });
});

describe('isNumber', () => {
  it('matches Lodash-compatible number checks', () => {
    expect(Lodash.isNumber(1)).toBe(true);
    expect(Lodash.isNumber(Number.NaN)).toBe(true);
    expect(Lodash.isNumber(Object(1))).toBe(true);
    expect(Lodash.isNumber('1')).toBe(false);
  });
});
