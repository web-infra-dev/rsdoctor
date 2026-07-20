import { describe, expect, it } from '@rstest/core';
import { compact } from '../src/common/lodash';

describe('compact', () => {
  it('removes falsy values', () => {
    expect(
      compact([false, null, 0, '', undefined, Number.NaN, 'value', 1]),
    ).toEqual(['value', 1]);
  });
});
