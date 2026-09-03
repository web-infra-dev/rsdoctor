import { describe, expect, it } from 'rstack/test';
import i18n from 'src/utils/i18n';

describe('i18n', () => {
  it('only exposes the English locale', () => {
    expect(i18n.language).toBe('en');
    expect(i18n.hasResourceBundle('en', 'translations')).toBe(true);
    expect(i18n.hasResourceBundle('cn', 'translations')).toBe(false);
  });
});
