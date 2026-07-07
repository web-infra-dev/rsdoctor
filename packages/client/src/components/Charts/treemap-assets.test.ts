import { describe, expect, it } from '@rstest/core';
import { syncCheckedAssets } from './treemap-assets';

describe('syncCheckedAssets', () => {
  it('keeps existing checked assets and selects new assets', () => {
    expect(
      syncCheckedAssets({
        previousAssetNames: ['main.js', 'vendor.js'],
        assetNames: ['main.js', 'styles.css'],
        checkedAssets: ['main.js'],
      }),
    ).toStrictEqual(['main.js', 'styles.css']);
  });

  it('preserves unchecked assets when the asset list is unchanged', () => {
    const checkedAssets = ['main.js'];

    expect(
      syncCheckedAssets({
        previousAssetNames: ['main.js', 'vendor.js'],
        assetNames: ['main.js', 'vendor.js'],
        checkedAssets,
      }),
    ).toBe(checkedAssets);
  });

  it('removes checked assets that are no longer present', () => {
    expect(
      syncCheckedAssets({
        previousAssetNames: ['main.js', 'vendor.js'],
        assetNames: ['main.js'],
        checkedAssets: ['main.js', 'vendor.js'],
      }),
    ).toStrictEqual(['main.js']);
  });
});
