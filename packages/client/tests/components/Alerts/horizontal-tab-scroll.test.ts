import { describe, expect, it } from '@rstest/core';
import { getNextHorizontalScrollLeft } from 'src/components/Alerts/useHorizontalTabScroll';

describe('getNextHorizontalScrollLeft', () => {
  const scrollMetrics = {
    scrollLeft: 100,
    scrollWidth: 1_000,
    clientWidth: 400,
    deltaX: 0,
    deltaY: 0,
    deltaMode: 0,
  };

  it('maps a vertical mouse wheel to horizontal scrolling', () => {
    expect(getNextHorizontalScrollLeft({ ...scrollMetrics, deltaY: 80 })).toBe(
      180,
    );
  });

  it('uses the dominant trackpad axis', () => {
    expect(
      getNextHorizontalScrollLeft({
        ...scrollMetrics,
        deltaX: -60,
        deltaY: 10,
      }),
    ).toBe(40);
  });

  it('keeps scrolling within the available range', () => {
    expect(
      getNextHorizontalScrollLeft({ ...scrollMetrics, deltaY: -1_000 }),
    ).toBe(0);
    expect(
      getNextHorizontalScrollLeft({ ...scrollMetrics, deltaY: 1_000 }),
    ).toBe(600);
  });
});
