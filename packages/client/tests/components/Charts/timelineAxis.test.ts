import { describe, expect, it } from 'rstack/test';
import { getTimelineAxisInterval } from 'src/components/Charts/TimelineCharts/axis';

describe('getTimelineAxisInterval', () => {
  it('limits a short timeline to about five intervals', () => {
    expect(
      getTimelineAxisInterval({ startTimestamp: 537, endTimestamp: 563 }),
    ).toBe(6);
  });

  it('keeps millisecond precision for very short timelines', () => {
    expect(
      getTimelineAxisInterval({ startTimestamp: 100, endTimestamp: 103 }),
    ).toBe(1);
  });

  it('lets ECharts choose the interval for missing or invalid extents', () => {
    expect(getTimelineAxisInterval()).toBeNull();
    expect(
      getTimelineAxisInterval({ startTimestamp: 100, endTimestamp: 100 }),
    ).toBeNull();
  });
});
