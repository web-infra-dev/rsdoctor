import type { Manifest } from '@rsdoctor/shared/types';
import { Summary } from '@rsdoctor/shared/common-browser';
import { describe, expect, it } from 'rstack/test';
import {
  findLargeAssets,
  getBuildOverview,
  getRuleFindings,
} from '../src/webmcp/report-tools';

const manifest = {
  name: 'production',
  data: {
    hash: 'abc123',
    chunkGraph: {
      assets: [
        { path: 'main.js', size: 300, chunks: ['main'] },
        { path: 'styles.css', size: 200, chunks: ['main'] },
        { path: 'image.png', size: 100, chunks: [] },
      ],
    },
    moduleGraph: { modules: [{}, {}] },
    packageGraph: { packages: [{}] },
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
        { costs: 40 },
        { costs: 60 },
        { name: Summary.SummaryCostsDataName.Minify, costs: 30 },
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
      modules: { count: 2 },
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
});
