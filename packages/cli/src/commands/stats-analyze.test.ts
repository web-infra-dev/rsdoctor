import { describe, expect, it } from '@rstest/core';
import { coercePort } from './stats-analyze';

describe('stats-analyze command', () => {
  it('coercePort() preserves undefined', () => {
    expect(coercePort()).toBeUndefined();
  });

  it('coercePort() converts valid port values to numbers', () => {
    expect(coercePort(8888)).toBe(8888);
    expect(coercePort('8888')).toBe(8888);
  });

  it('coercePort() rejects invalid port values', () => {
    expect(() => coercePort('foo')).toThrow('Invalid port: foo');
  });
});
