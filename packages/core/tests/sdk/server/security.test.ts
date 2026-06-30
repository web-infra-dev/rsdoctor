import { describe, expect, it } from '@rstest/core';
import {
  isAllowedCorsRequest,
  isAllowedRequestHost,
  isAllowedRequestOrigin,
} from '../../../src/sdk/server/security';

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

  it('allows CORS requests from matching local origins', () => {
    expect(
      isAllowedCorsRequest('http://127.0.0.1:3001', '127.0.0.1:3000'),
    ).toBe(true);
    expect(
      isAllowedCorsRequest('http://foo.localhost:3001', 'foo.localhost:3000'),
    ).toBe(true);
  });

  it('rejects CORS requests from non-local or mismatched origins', () => {
    expect(isAllowedCorsRequest('https://example.com', '127.0.0.1:3000')).toBe(
      false,
    );
    expect(
      isAllowedCorsRequest('http://foo.localhost:3001', '127.0.0.1:3000'),
    ).toBe(false);
  });
});
