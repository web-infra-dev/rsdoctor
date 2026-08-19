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
      'packages_direct_dependencies',
      'packages_duplicates',
      'packages_similar',
      'tree_shaking_retained_modules',
      'tree_shaking_side_effects',
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

  it('passes bundle output limits into built commands', () => {
    const bundleOptimize = getToolCatalog().find(
      (tool) => tool.name === 'bundle_optimize',
    );

    expect(
      bundleOptimize?.buildCommand({
        dataFile: '/tmp/rsdoctor-data.json',
        input: { limit: 2 },
      }),
    ).toEqual([
      'rsdoctor-agent',
      'bundle',
      'optimize',
      '--data-file',
      '/tmp/rsdoctor-data.json',
      '--compact',
      '--limit',
      '2',
    ]);
  });

  it('passes tool-specific input into built commands', () => {
    const catalog = getToolCatalog();
    const sideEffects = catalog.find(
      (tool) => tool.name === 'tree_shaking_side_effects',
    );

    expect(
      sideEffects?.buildCommand({
        dataFile: '/tmp/rsdoctor-data.json',
        input: { category: 'cjs' },
      }),
    ).toEqual([
      'rsdoctor-agent',
      'tree-shaking',
      'side-effects',
      '--data-file',
      '/tmp/rsdoctor-data.json',
      '--compact',
      '--category',
      'cjs',
    ]);
  });

  it('declares the pagination aliases accepted by catalog tools', () => {
    const [tool] = getToolCatalog();

    expect(tool.inputSchema.properties).toMatchObject({
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 1000,
      },
      pageNumber: {
        type: 'integer',
        minimum: 1,
      },
    });
  });
});
