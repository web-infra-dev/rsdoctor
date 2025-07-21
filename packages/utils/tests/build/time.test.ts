import { describe, it, expect, rs } from '@rstest/core';
import { hrtime } from 'process';
import { Time } from '../../src/common';

rs.setConfig({ testTimeout: 100000 });

describe('test src/build/time.ts', () => {
  it('getCurrentTimestamp', async () => {
    const start = Date.now();
    const startH = hrtime();
    const delay = 500;

    const value = await new Promise((r) => {
      setTimeout(() => {
        r(Time.getCurrentTimestamp(start, startH));
      }, delay);
    });

    expect(value).toBeGreaterThanOrEqual(start + delay);
  });
});
