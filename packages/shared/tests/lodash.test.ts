import { describe, expect, it } from '@rstest/core';
import { compact, isNumber } from '../src/common/lodash';

describe('compact', () => {
  it('removes falsy values', () => {
    expect(
      compact([false, null, 0, '', undefined, Number.NaN, 'value', 1]),
    ).toEqual(['value', 1]);
  });
});

describe('isNumber', () => {
  it('matches Lodash-compatible number checks', () => {
    expect(isNumber(1)).toBe(true);
    expect(isNumber(Number.NaN)).toBe(true);
    expect(isNumber(Object(1))).toBe(true);
    expect(isNumber('1')).toBe(false);
  });
});
