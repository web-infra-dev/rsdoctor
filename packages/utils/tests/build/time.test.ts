import { describe, it, expect, vi } from 'vitest';
import { hrtime } from 'process';
import { Time } from '../../src/common';

vi.setConfig({ testTimeout: 100000 });

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
