import { describe, expect, it } from '@rstest/core';
import { isJavaScriptAsset } from './assets';

describe('assets utils', () => {
  it('detects JavaScript assets by extension', () => {
    expect(isJavaScriptAsset('app.js')).toBe(true);
    expect(isJavaScriptAsset('chunk.CJS')).toBe(true);
    expect(isJavaScriptAsset('runtime.mjs')).toBe(true);
    expect(isJavaScriptAsset('page.jsx')).toBe(true);
    expect(isJavaScriptAsset('main.bundle')).toBe(true);
  });

  it('ignores query strings and hashes when checking extensions', () => {
    expect(isJavaScriptAsset('app.js?x=1')).toBe(true);
    expect(isJavaScriptAsset('chunk.mjs#content')).toBe(true);
    expect(isJavaScriptAsset('page.jsx?x=1#content')).toBe(true);
  });

  it('returns false when the asset path has no extension', () => {
    expect(isJavaScriptAsset('app')).toBe(false);
    expect(isJavaScriptAsset('app?x=1')).toBe(false);
  });
});
