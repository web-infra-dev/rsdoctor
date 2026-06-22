import { describe, expect, it } from '@rstest/core';
import {
  isAllowedRequestHost,
  isAllowedRequestOrigin,
} from '../../src/sdk/server/security';

describe('test server/security.ts', () => {
  it('allows local request origins', () => {
    expect(isAllowedRequestOrigin(undefined)).toBe(true);
    expect(isAllowedRequestOrigin('http://localhost:3000')).toBe(true);
    expect(isAllowedRequestOrigin('https://foo.localhost:3000')).toBe(true);
    expect(isAllowedRequestOrigin('http://127.0.0.1:3000')).toBe(true);
    expect(isAllowedRequestOrigin('http://[::1]:3000')).toBe(true);
  });

  it('rejects non-local request origins', () => {
    expect(isAllowedRequestOrigin('https://example.com')).toBe(false);
    expect(isAllowedRequestOrigin('http://foo.localhost.evil.com')).toBe(false);
    expect(isAllowedRequestOrigin(['http://localhost:3000'])).toBe(false);
  });

  it('allows local request hosts', () => {
    expect(isAllowedRequestHost('localhost:3000')).toBe(true);
    expect(isAllowedRequestHost('foo.localhost:3000')).toBe(true);
    expect(isAllowedRequestHost('127.0.0.1:3000')).toBe(true);
    expect(isAllowedRequestHost('[::1]:3000')).toBe(true);
    expect(isAllowedRequestHost('192.168.1.10:3000')).toBe(true);
  });

  it('rejects non-local request hosts', () => {
    expect(isAllowedRequestHost(undefined)).toBe(false);
    expect(isAllowedRequestHost('example.com:3000')).toBe(false);
    expect(isAllowedRequestHost('foo.localhost.evil.com:3000')).toBe(false);
    expect(isAllowedRequestHost(['localhost:3000'])).toBe(false);
  });
});
