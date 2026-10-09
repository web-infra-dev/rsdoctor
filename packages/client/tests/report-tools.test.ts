import type { Manifest } from '@rsdoctor/shared/types';
import { describe, expect, it } from 'rstack/test';
import {
  findLargeAssets,
  findLargePackages,
  findSharedModules,
  findCompressibleAssets,
  getEntrypoints,
  getChunkModuleDependencyChains,
  getBuildTimingBreakdown,
  getBuildOverview,
  getRuleFindings,
  registerReportTools,
} from '../src/webmcp/report-tools';

const manifest = {
  name: 'production',
  data: {
    hash: 'abc123',
    chunkGraph: {
      assets: [
        {
          path: 'main.js',
          size: 300,
          gzipSize: 120,
          brotliSize: 100,
          chunks: ['main'],
        },
        { path: 'styles.css', size: 200, gzipSize: 150, chunks: ['main'] },
        { path: 'image.png', size: 100, chunks: [] },
      ],
      chunks: [{ id: 'main', modules: [1, 2] }],
      entrypoints: [
        {
          id: 1,
          name: 'main',
          chunks: ['main'],
          assets: ['main.js', 'styles.css'],
          size: 500,
        },
      ],
    },
    moduleGraph: {
      modules: [
        {
          id: 1,
          path: 'src/index.ts',
          identifier: './src/index.ts',
          dependencies: [1],
          chunks: ['main'],
          size: { parsedSize: 100 },
        },
        {
          id: 2,
          path: 'src/unused.ts',
          identifier: './src/unused.ts',
          dependencies: [],
          chunks: ['main'],
          size: { parsedSize: 50 },
        },
        {
          id: 3,
          path: 'node_modules/library/index.js',
          identifier: './node_modules/library/index.js',
          dependencies: [2],
          chunks: ['main', 'async'],
          size: { parsedSize: 200 },
        },
      ],
      dependencies: [
        { id: 1, dependency: 3 },
        { id: 2, dependency: 2 },
      ],
    },
    packageGraph: {
      packages: [
        {
          id: 1,
          name: 'library',
          version: '1.0.0',
          root: 'node_modules/library',
          modules: [3],
          size: { parsedSize: 200 },
        },
      ],
    },
    errors: [
      {
        id: '1',
        code: 'duplicate-package',
        category: 'bundle',
        title: 'Duplicate package',
        level: 'warn',
      },
      {
        id: '2',
        code: 'large-asset',
        category: 'bundle',
        title: 'Large asset',
        description: 'x'.repeat(600),
        level: 'error',
      },
    ],
    summary: {
      costs: [
        { name: 'compile', startAt: 0, costs: 40 },
        { name: 'minify', startAt: 40, costs: 60 },
      ],
    },
  },
} as unknown as Manifest.RsdoctorManifest;

describe('Rsdoctor WebMCP report tools', () => {
  it('returns a compact build overview', () => {
    expect(getBuildOverview(manifest)).toEqual({
      buildName: 'production',
      hash: 'abc123',
      assets: { count: 3, totalBytes: 600 },
      modules: { count: 3 },
      packages: { count: 1 },
      findings: { error: 1, warn: 1 },
      buildDurationMs: 100,
    });
  });

  it('filters and limits large assets', () => {
    expect(findLargeAssets(manifest, { assetType: 'js', limit: 1 })).toEqual({
      total: 1,
      items: [{ path: 'main.js', size: 300, type: 'js', chunks: ['main'] }],
      truncated: false,
    });
  });

  it('finds the assets with the largest compression savings', () => {
    expect(
      findCompressibleAssets(manifest, { compression: 'gzip' }),
    ).toMatchObject({
      total: 2,
      items: [
        { path: 'main.js', compressedSize: 120, savingsBytes: 180 },
        { path: 'styles.css', compressedSize: 150, savingsBytes: 50 },
      ],
    });
  });

  it('ranks build stages by duration', () => {
    expect(getBuildTimingBreakdown(manifest, {})).toEqual({
      totalDurationMs: 100,
      total: 2,
      items: [
        { name: 'minify', startAt: 40, durationMs: 60, percentOfTotal: 60 },
        { name: 'compile', startAt: 0, durationMs: 40, percentOfTotal: 40 },
      ],
      truncated: false,
    });
  });

  it('filters findings and bounds untrusted text', () => {
    const result = getRuleFindings(manifest, { severity: 'error' });

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: '2',
      code: 'large-asset',
      severity: 'error',
    });
    expect(result.items[0]?.description).toHaveLength(500);
  });

  it('lists entrypoints, large packages, and shared modules', () => {
    expect(getEntrypoints(manifest, {})).toMatchObject({
      total: 1,
      items: [{ name: 'main', size: 500, chunks: ['main'] }],
    });
    expect(findLargePackages(manifest, { query: 'library' })).toMatchObject({
      total: 1,
      items: [{ name: 'library', parsedSize: 200, moduleCount: 1 }],
    });
    expect(findSharedModules(manifest, {})).toMatchObject({
      total: 1,
      items: [{ id: 3, chunks: ['main', 'async'], parsedSize: 200 }],
    });
  });

  it('traces a chunk module through its dependency chain', () => {
    expect(
      getChunkModuleDependencyChains(manifest, {
        chunkId: 'main',
        moduleId: 1,
      }),
    ).toEqual({
      total: 1,
      items: [
        {
          module: {
            id: 1,
            path: 'src/index.ts',
            identifier: './src/index.ts',
          },
          chain: [
            {
              id: 1,
              path: 'src/index.ts',
              identifier: './src/index.ts',
            },
            {
              id: 3,
              path: 'node_modules/library/index.js',
              identifier: './node_modules/library/index.js',
            },
            {
              id: 2,
              path: 'src/unused.ts',
              identifier: './src/unused.ts',
            },
          ],
          truncated: false,
        },
      ],
      truncated: false,
    });
  });

  it('reports the complete dependency-chain count when limiting results', () => {
    expect(
      getChunkModuleDependencyChains(manifest, { chunkId: 'main', limit: 1 }),
    ).toMatchObject({
      total: 2,
      items: [{ module: { id: 1 } }],
      truncated: true,
    });
    expect(
      getChunkModuleDependencyChains(manifest, {
        chunkId: 'main',
        moduleId: 1,
        limit: 1,
      }),
    ).toMatchObject({ total: 1, truncated: false });
  });

  it('requires a chunk identifier when registering dependency-chain tools', async () => {
    const originalDocument = Object.getOwnPropertyDescriptor(
      globalThis,
      'document',
    );
    const tools: Array<{ name: string; inputSchema: Record<string, unknown> }> =
      [];

    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        modelContext: {
          registerTool: async (tool: (typeof tools)[number]) => {
            tools.push(tool);
          },
        },
      },
    });

    try {
      await registerReportTools(manifest, new AbortController().signal);
    } finally {
      if (originalDocument) {
        Object.defineProperty(globalThis, 'document', originalDocument);
      } else {
        Reflect.deleteProperty(globalThis, 'document');
      }
    }

    expect(
      tools.find((tool) => tool.name === 'get_chunk_module_dependency_chains')
        ?.inputSchema,
    ).toMatchObject({ required: ['chunkId'] });
  });
});
