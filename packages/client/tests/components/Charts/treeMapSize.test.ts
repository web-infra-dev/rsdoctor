import { describe, expect, it } from 'rstack/test';
import {
  calculateTreeNodeTotalSize,
  calculateTreeNodesTotalSize,
} from 'src/components/Charts/treeMapSize';

describe('treeMapSize', () => {
  it('uses the asset size instead of summing module sizes', () => {
    expect(
      calculateTreeNodeTotalSize(
        {
          gzipSize: 100,
          children: [{ gzipSize: 40 }, { gzipSize: 50 }],
        },
        'gzip',
      ),
    ).toBe(100);
  });

  it('sums children when a directory has no own size', () => {
    expect(
      calculateTreeNodeTotalSize(
        {
          children: [{ bundledSize: 40 }, { bundledSize: 50 }],
        },
        'parsed',
      ),
    ).toBe(90);
  });

  it('sums all visible assets using the selected size type', () => {
    expect(
      calculateTreeNodesTotalSize(
        [{ gzipSize: 100 }, { gzipSize: 25 }, { gzipSize: 5 }],
        'gzip',
      ),
    ).toBe(130);
  });
});
describe('Brotli treemap sizes', () => {
  it('uses the asset size instead of summing module sizes', () => {
    expect(
      calculateTreeNodeTotalSize(
        {
          brotliSize: 100,
          children: [{ brotliSize: 40 }, { brotliSize: 50 }],
        },
        'brotli',
      ),
    ).toBe(100);
  });

  it('sums children when a directory has no own size', () => {
    expect(
      calculateTreeNodeTotalSize(
        {
          children: [{ brotliSize: 40 }, { brotliSize: 50 }],
        },
        'brotli',
      ),
    ).toBe(90);
  });

  it('sums all visible assets using the selected size type', () => {
    expect(
      calculateTreeNodesTotalSize(
        [{ brotliSize: 100 }, { brotliSize: 25 }, { brotliSize: 5 }],
        'brotli',
      ),
    ).toBe(130);
  });
});
