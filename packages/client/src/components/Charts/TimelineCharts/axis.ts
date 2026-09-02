export interface TimelineExtent {
  startTimestamp: number;
  endTimestamp: number;
}

const TARGET_SPLIT_COUNT = 5;

export function getTimelineAxisInterval(
  extent?: TimelineExtent,
): number | null {
  if (!extent) {
    return null;
  }

  const duration = extent.endTimestamp - extent.startTimestamp;
  if (!Number.isFinite(duration) || duration <= 0) {
    return null;
  }

  return Math.max(1, Math.ceil(duration / TARGET_SPLIT_COUNT));
}
