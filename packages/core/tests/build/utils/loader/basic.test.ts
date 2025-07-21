import { describe, it, expect } from '@rstest/core';
import { extractLoaderName } from '@/build-utils/build/utils';

describe('test src/build/utils/loader.ts basic functions', () => {
  it('extractLoaderName()', () => {
    expect(extractLoaderName('cache-loader')).toEqual('cache-loader');
    expect(
      extractLoaderName('/Users/node_modules/cache-loader/lib/index.js'),
    ).toEqual('cache-loader');
    expect(
      extractLoaderName('/Users/node_modules/cache-loader/lib/loader.js'),
    ).toEqual('cache-loader/lib/loader');
  });
});
