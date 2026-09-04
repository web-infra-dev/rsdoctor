import { describe, expect, it } from '@rstest/core';
import { getModuleDiffKey } from 'src/pages/Resources/BundleDiff/DiffContainer/moduleDiff';

describe('getModuleDiffKey', () => {
  it('removes Lynx module hash suffixes', () => {
    expect(
      getModuleDiffKey({
        webpackId: 'src/index.tsx|react:background|2403f25f21c75a9b',
      }),
    ).toBe('src/index.tsx|react:background');
  });

  it('matches modules when only their hash suffix changes', () => {
    expect(
      getModuleDiffKey({
        webpackId: 'src/index.tsx|react:background|2403f25f21c75a9b',
      }),
    ).toBe(
      getModuleDiffKey({
        webpackId: 'src/index.tsx|react:background|763a598f996fe14b',
      }),
    );
  });

  it('preserves 16-character hexadecimal segments in module paths', () => {
    expect(
      getModuleDiffKey({
        webpackId: 'src/0123456789abcdef/index.ts',
      }),
    ).toBe('src/0123456789abcdef/index.ts');
  });

  it('falls back to the path when normalizing the webpack ID removes it', () => {
    expect(
      getModuleDiffKey({
        webpackId: '0123456789abcdef0123',
        path: 'src/index.tsx',
      }),
    ).toBe('src/index.tsx');

    expect(
      getModuleDiffKey({
        webpackId: '|0123456789abcdef',
        path: 'src/App.tsx',
      }),
    ).toBe('src/App.tsx');
  });
});
