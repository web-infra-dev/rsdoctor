import { describe, it, expect, rs } from '@rstest/core';
import { Time } from '@rsdoctor/shared/common-browser';
import { hrtime } from 'process';

rs.setConfig({ testTimeout: 100000 });

describe('test src/common/time.ts', () => {
  it('getCurrentTimestamp', async () => {
    const start = Date.now();
    const startH = hrtime();
    const delay = 500;

    const value = await new Promise((resolve) => {
      setTimeout(() => {
        resolve(Time.getCurrentTimestamp(start, startH));
      }, delay);
    });

    expect(value).toBeGreaterThanOrEqual(start + delay);
  });

  it('toFixedDigits', () => {
    expect(Time.toFixedDigits(100, 0)).toEqual(100);
    expect(Time.toFixedDigits(100.1, 0)).toEqual(100);
    expect(Time.toFixedDigits(100.9, 0)).toEqual(100);
    expect(Time.toFixedDigits(100.1, 2)).toEqual(100.1);
    expect(Time.toFixedDigits(100.9, 2)).toEqual(100.9);
    expect(Time.toFixedDigits(100.19, 1)).toEqual(100.2);
    expect(Time.toFixedDigits(100.99, 1)).toEqual(101);
    expect(Time.toFixedDigits(100.19, 2)).toEqual(100.19);
    expect(Time.toFixedDigits(100.99, 2)).toEqual(100.99);
  });

  it('getUnit', () => {
    expect(Time.getUnit(0, 'm')).toEqual('min');
    expect(Time.getUnit(1, 'm')).toEqual('min');
    expect(Time.getUnit(2, 'm')).toEqual('mins');
    expect(Time.getUnit(0, 'h')).toEqual('hour');
    expect(Time.getUnit(1, 'h')).toEqual('hour');
    expect(Time.getUnit(2, 'h')).toEqual('hours');
  });

  it('formatCosts', () => {
    expect(Time.formatCosts(75500 * 60)).toStrictEqual('1hour 15.5mins');
    expect(Time.formatCosts(287617)).toStrictEqual('4mins 47s');
    expect(Time.formatCosts(75500)).toStrictEqual('1min 15s');
    expect(Time.formatCosts(75000)).toStrictEqual('1min 15s');
    expect(Time.formatCosts(5500)).toStrictEqual('5.5s');
    expect(Time.formatCosts(10.5)).toStrictEqual('10ms');
    expect(Time.formatCosts(1.12)).toStrictEqual('1.1ms');
    expect(Time.formatCosts(0.567)).toStrictEqual('0.57ms');
    expect(Time.formatCosts(0.004)).toStrictEqual('0.004ms');
  });
});
