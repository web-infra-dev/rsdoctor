import { describe, it, expect } from '@rstest/core';
import { Graph } from '../../src/common';

describe('test src/common/graph.ts', () => {
  it('formatAssetName', () => {
    expect(Graph.formatAssetName('')).toBe('');
    expect(Graph.formatAssetName('index')).toBe('index');
    expect(Graph.formatAssetName('common/index.js')).toBe('common/index.js');
    expect(Graph.formatAssetName('index.js')).toBe('index.js');
    expect(
      Graph.formatAssetName('common/index.ajsb1.js', 'common/[name].[hash].js'),
    ).toBe('common/index.js');
    expect(Graph.formatAssetName('index.ajsb1.js')).toBe('index.js');
    expect(
      Graph.formatAssetName('common/index-ajsb1.js', 'common/[name]-[hash].js'),
    ).toBe('common/index.js');
    expect(Graph.formatAssetName('index-ajsb1.js')).toBe('index.js');
    expect(Graph.formatAssetName('common/index.js.map')).toBe(
      'common/index.js.map',
    );
    expect(Graph.formatAssetName('index.js.map')).toBe('index.js.map');
    expect(Graph.formatAssetName('common/index.ajsb1.js.map')).toBe(
      'common/index.js.map',
    );
    expect(Graph.formatAssetName('index.ajsb1.js.map')).toBe('index.js.map');
    expect(Graph.formatAssetName('common/index-ajsb1.js.map')).toBe(
      'common/index.js.map',
    );
    expect(Graph.formatAssetName('index-ajsb1.js.map')).toBe('index.js.map');
    expect(Graph.formatAssetName('common/index-aas123-ajsb1.js')).toBe(
      'common/index-aas123.js',
    );
    expect(Graph.formatAssetName('common/index.aas123.ajsb1.js')).toBe(
      'common/index.aas123.js',
    );
    expect(
      Graph.formatAssetName('index-aas123-ajsb1.js', '[name]-[hash].js'),
    ).toBe('index-aas123.js');
    expect(Graph.formatAssetName('index.aas123.ajsb1.js')).toBe(
      'index.aas123.js',
    );
    expect(Graph.formatAssetName('common/index-aas123-ajsb1.js.map')).toBe(
      'common/index-aas123.js.map',
    );
    expect(Graph.formatAssetName('common/index.aas123.ajsb1.js.map')).toBe(
      'common/index.aas123.js.map',
    );
    expect(Graph.formatAssetName('index-aas123-ajsb1.js.map')).toBe(
      'index-aas123.js.map',
    );
    expect(Graph.formatAssetName('index.aas123.ajsb1.js.map')).toBe(
      'index.aas123.js.map',
    );
    expect(Graph.formatAssetName('common/index-aas123-ajsb1.txt.LICENSE')).toBe(
      'common/index-aas123.txt.LICENSE',
    );
    expect(Graph.formatAssetName('common/index.aas123.ajsb1.txt.LICENSE')).toBe(
      'common/index.aas123.txt.LICENSE',
    );
    expect(
      Graph.formatAssetName(
        'index-aas123-ajsb1.txt.LICENSE',
        '[name]-[chunkhash].txt',
      ),
    ).toBe('index-aas123.txt.LICENSE');
    expect(
      Graph.formatAssetName(
        'index.aas123.ajsb1.txt.LICENSE',
        '[name]-[chunkhash].txt',
      ),
    ).toBe('index.aas123.txt.LICENSE');
    expect(
      Graph.formatAssetName(
        'js/okr_block.663b6aff6da26ba53cc3.no.js',
        'js/[name].[chunkhash].no.js',
      ),
    ).toBe('js/okr_block.no.js');
    expect(
      Graph.formatAssetName(
        'js/okr_block.663b6aff6da26ba53cc3.no-online.js',
        'js/[name].[chunkhash].no-online.js',
      ),
    ).toBe('js/okr_block.no-online.js');
    // Test cases for filenames with common words that should NOT be treated as hash
    expect(Graph.formatAssetName('zh/api/config/config-basic.html')).toBe(
      'zh/api/config/config-basic.html',
    );
    expect(Graph.formatAssetName('config-basic.html')).toBe(
      'config-basic.html',
    );
    expect(Graph.formatAssetName('main.js')).toBe('main.js');
    expect(Graph.formatAssetName('index-main.js')).toBe('index-main.js');
    expect(Graph.formatAssetName('common/index-basic.js')).toBe(
      'common/index-basic.js',
    );
    // Test cases for short version numbers that should NOT be treated as hash
    expect(Graph.formatAssetName('config-v2.html')).toBe('config-v2.html');
    expect(Graph.formatAssetName('config-v1.html')).toBe('config-v1.html');
    expect(Graph.formatAssetName('index-v2.js')).toBe('index-v2.js');
    expect(Graph.formatAssetName('app-v1.0.js')).toBe('app-v1.0.js');
    // Test cases for filenames with hash that should be removed (4+ chars)
    expect(Graph.formatAssetName('config-a1b2c3d4.html')).toBe('config.html');
    expect(Graph.formatAssetName('config.a1b2c3d4.html')).toBe('config.html');
    expect(Graph.formatAssetName('zh/api/config/config-a1b2c3d4.html')).toBe(
      'zh/api/config/config.html',
    );
    // Test cases for hex hash (should be removed)
    expect(Graph.formatAssetName('index.663b6aff6da26ba53cc3.js')).toBe(
      'index.js',
    );
    expect(Graph.formatAssetName('index-663b6aff6da26ba53cc3.js')).toBe(
      'index.js',
    );
    // Test cases for alphanumeric hash with digits (should be removed)
    expect(Graph.formatAssetName('index.abc123def456.js')).toBe('index.js');
    expect(Graph.formatAssetName('index-abc123def456.js')).toBe('index.js');
  });

  it('isAssetMatchExtension should match .bundle files', () => {
    const bundleAsset = { path: 'main.bundle', type: 'asset' as const };
    const jsAsset = { path: 'main.js', type: 'asset' as const };
    const cssAsset = { path: 'main.css', type: 'asset' as const };

    // Test .bundle extension matching
    expect(Graph.isAssetMatchExtension(bundleAsset, '.bundle')).toBe(true);
    expect(Graph.isAssetMatchExtension(bundleAsset, '.js')).toBe(false);

    // Test .js extension matching
    expect(Graph.isAssetMatchExtension(jsAsset, '.js')).toBe(true);
    expect(Graph.isAssetMatchExtension(jsAsset, '.bundle')).toBe(false);

    // Test other extensions
    expect(Graph.isAssetMatchExtension(cssAsset, '.css')).toBe(true);
    expect(Graph.isAssetMatchExtension(cssAsset, '.js')).toBe(false);
  });

  it('isAssetMatchExtensions should match .bundle files in array', () => {
    const bundleAsset = { path: 'main.bundle', type: 'asset' as const };
    const jsAsset = { path: 'main.js', type: 'asset' as const };

    // Test matching with multiple extensions
    expect(Graph.isAssetMatchExtensions(bundleAsset, ['.js', '.bundle'])).toBe(
      true,
    );
    expect(Graph.isAssetMatchExtensions(jsAsset, ['.js', '.bundle'])).toBe(
      true,
    );
    expect(Graph.isAssetMatchExtensions(bundleAsset, ['.css', '.html'])).toBe(
      false,
    );
  });

  it('filterAssetsByExtensions should filter .bundle files', () => {
    const assets = [
      { path: 'main.bundle', type: 'asset' as const },
      { path: 'main.js', type: 'asset' as const },
      { path: 'styles.css', type: 'asset' as const },
      { path: 'vendor.bundle', type: 'asset' as const },
    ];

    // Filter by .bundle extension
    const bundleAssets = Graph.filterAssetsByExtensions(assets, '.bundle');
    expect(bundleAssets).toHaveLength(2);
    expect(bundleAssets[0].path).toBe('main.bundle');
    expect(bundleAssets[1].path).toBe('vendor.bundle');

    // Filter by multiple extensions
    const jsAndBundleAssets = Graph.filterAssetsByExtensions(assets, [
      '.js',
      '.bundle',
    ]);
    expect(jsAndBundleAssets).toHaveLength(3);

    // Filter by .css extension
    const cssAssets = Graph.filterAssetsByExtensions(assets, '.css');
    expect(cssAssets).toHaveLength(1);
    expect(cssAssets[0].path).toBe('styles.css');
  });
});
