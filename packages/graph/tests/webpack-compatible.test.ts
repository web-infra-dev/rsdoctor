import { describe, expect, it } from '@rstest/core';
import { getDependencyPosition } from '../src/transform/webpack/compatible';

describe('Webpack/compatible/getDependencyPosition', () => {
  it('returns undefined when dependency loc is null', () => {
    let result: ReturnType<typeof getDependencyPosition>;

    expect(() => {
      result = getDependencyPosition({ loc: null } as any, {} as any);
    }).not.toThrow();
    expect(result).toBeUndefined();
  });
});
