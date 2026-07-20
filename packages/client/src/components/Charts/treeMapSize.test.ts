import { describe, expect, it } from '@rstest/core';
import {
  calculateTreeNodeTotalSize,
  calculateTreeNodesTotalSize,
} from './treeMapSize';

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
