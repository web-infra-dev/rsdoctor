import { describe, expect, it, rs } from '@rstest/core';

rs.mock('src/utils/i18n', () => ({}));

import { getSafeExternalUrl } from 'src/utils/hooks';

describe('getSafeExternalUrl', () => {
  it('accepts HTTP and HTTPS URLs', () => {
    expect(getSafeExternalUrl('https://rsdoctor.rs/guide')).toBe(
      'https://rsdoctor.rs/guide',
    );
    expect(getSafeExternalUrl('http://localhost:3000')).toBe(
      'http://localhost:3000/',
    );
  });

  it.each([
    'javascript:alert(document.domain)',
    'data:text/html,<script>alert(1)</script>',
    'file:///tmp/report.html',
    '/guide',
    'not a URL',
  ])('rejects unsafe URL %s', (link) => {
    expect(getSafeExternalUrl(link)).toBeUndefined();
  });
});
