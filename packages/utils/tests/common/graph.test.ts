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
});
