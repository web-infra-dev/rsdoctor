import { afterEach, describe, expect, it } from 'rstack/test';
import { formatLocalDate } from '../../../src/sdk/utils/date';

const originalTimezone = process.env.TZ;

afterEach(() => {
  if (originalTimezone === undefined) {
    delete process.env.TZ;
  } else {
    process.env.TZ = originalTimezone;
  }
});

describe('formatLocalDate', () => {
  it.each([
    ['UTC', '2024-12-31T23:30:00.000Z', '20241231'],
    ['Asia/Shanghai', '2024-12-31T23:30:00.000Z', '20250101'],
  ])('formats a date in %s', (timezone, input, expected) => {
    process.env.TZ = timezone;

    expect(formatLocalDate(new Date(input))).toBe(expected);
  });

  it.each([
    ['2024-03-10T04:59:59.000Z', '20240309'],
    ['2024-03-10T05:00:00.000Z', '20240310'],
    ['2024-03-10T06:59:59.000Z', '20240310'],
    ['2024-03-10T07:00:00.000Z', '20240310'],
    ['2024-11-03T03:59:59.000Z', '20241102'],
    ['2024-11-03T04:00:00.000Z', '20241103'],
    ['2024-11-03T05:59:59.000Z', '20241103'],
    ['2024-11-03T06:00:00.000Z', '20241103'],
  ])('handles the New York DST boundary at %s', (input, expected) => {
    process.env.TZ = 'America/New_York';

    expect(formatLocalDate(new Date(input))).toBe(expected);
  });
});
