import { describe, expect, it } from '@rstest/core';
import {
  createAssetPathMap,
  normalizeAssetPath,
  resolveAssetFileTitleTarget,
} from './asset-path';

describe('BundleSize asset path helpers', () => {
  it('normalizes Windows path separators', () => {
    expect(normalizeAssetPath('static\\js\\main.js')).toBe('static/js/main.js');
  });

  it('resolves assets using normalized tree file paths', () => {
    const asset = {
      path: 'static\\js\\main.js',
      size: 1024,
    };
    const assetsMap = createAssetPathMap([asset]);

    expect(
      resolveAssetFileTitleTarget(assetsMap, 'static/js/main.js', 'main.js'),
    ).toBe(asset);
  });

  it('falls back to basename when the asset lookup misses', () => {
    const assetsMap = createAssetPathMap([{ path: 'static/js/main.js' }]);

    expect(
      resolveAssetFileTitleTarget(assetsMap, 'static/css/main.css', 'main.css'),
    ).toBe('main.css');
  });
});
