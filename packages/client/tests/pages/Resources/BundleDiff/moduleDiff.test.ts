import { describe, expect, it } from '@rstest/core';
import { getModuleDiffKey } from '../../../../src/pages/Resources/BundleDiff/DiffContainer/moduleDiff';

describe('getModuleDiffKey', () => {
  it('removes Lynx module hash suffixes', () => {
    expect(
      getModuleDiffKey({
        identifier: 'src/index.tsx|react:background|2403f25f21c75a9b',
      }),
    ).toBe('src/index.tsx|react:background');
  });

  it('matches modules when only their hash suffix changes', () => {
    const baseline = getModuleDiffKey({
      identifier: 'src/index.tsx|react:main-thread|4f54cd8870fbdd74',
    });
    const current = getModuleDiffKey({
      identifier: 'src/index.tsx|react:main-thread|8b64892fb455b7bf',
    });

    expect(current).toBe(baseline);
  });

  it('preserves hexadecimal strings in module paths', () => {
    expect(getModuleDiffKey({ path: 'src/0123456789abcdef/index.ts' })).toBe(
      'src/0123456789abcdef/index.ts',
    );
  });
});
