import { describe, expect, it } from '@rstest/core';

import { getToolCatalog } from '../src/commands';

describe('tool catalog', () => {
  it('registers the high-value rsdoctor tools', () => {
    const catalog = getToolCatalog();

    expect(catalog.map((tool) => tool.name).sort()).toEqual([
      'build_summary',
      'bundle_optimize',
      'chunks_list',
      'errors_list',
      'packages_duplicates',
      'packages_similar',
      'tree_shaking_summary',
    ]);
  });

  it('builds the expected rsdoctor-agent command for tools', () => {
    const catalog = getToolCatalog();
    const bundleOptimize = catalog.find(
      (tool) => tool.name === 'bundle_optimize',
    );

    expect(bundleOptimize).toBeDefined();
    expect(
      bundleOptimize?.buildCommand({
        dataFile: '/tmp/rsdoctor-data.json',
        input: {},
      }),
    ).toEqual([
      'rsdoctor-agent',
      'bundle',
      'optimize',
      '--data-file',
      '/tmp/rsdoctor-data.json',
      '--compact',
    ]);
  });
});
