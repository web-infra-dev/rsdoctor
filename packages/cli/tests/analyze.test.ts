import path from 'node:path';
import { describe, expect, it } from '@rstest/core';
import { resolveLocalManifestShardingFiles } from '../src/commands/analyze';

describe('analyze command', () => {
  it('resolves local manifest shard paths relative to the manifest file', () => {
    const cwd = path.join(path.sep, 'repo');
    const manifest = path.join('reports', '.rsdoctor', 'manifest.json');

    const result = resolveLocalManifestShardingFiles(
      {
        root: '/repo',
        summary: ['summary/0'],
        moduleGraph: ['moduleGraph/0', '/tmp/absolute-shard'],
        cloudData: 'https://example.com/cloud-shard',
        errors: [],
      },
      manifest,
      cwd,
    );

    expect(result.summary).toStrictEqual([
      path.join(cwd, 'reports', '.rsdoctor', 'summary/0'),
    ]);
    expect(result.moduleGraph).toStrictEqual([
      path.join(cwd, 'reports', '.rsdoctor', 'moduleGraph/0'),
      '/tmp/absolute-shard',
    ]);
    expect(result.cloudData).toBe('https://example.com/cloud-shard');
    expect(result.errors).toStrictEqual([]);
  });
});
