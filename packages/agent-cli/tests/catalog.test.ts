import { describe, expect, it } from '@rstest/core';

import { createRsdoctorToolCatalog } from '../src/tools/catalog';

describe('tool catalog', () => {
  it('registers the high-value rsdoctor tools', () => {
    const catalog = createRsdoctorToolCatalog();

    expect(catalog.map((tool) => tool.name)).toEqual([
      'build_summary',
      'bundle_optimize',
      'chunks_list',
      'packages_duplicates',
      'packages_similar',
      'tree_shaking_summary',
      'errors_list',
    ]);
  });

  it('builds the expected rsdoctor-agent command for tools', () => {
    const catalog = createRsdoctorToolCatalog();
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
