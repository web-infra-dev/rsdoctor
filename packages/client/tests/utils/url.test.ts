import { describe, expect, it } from 'rstack/test';
import { getSafeReportUrl } from 'src/utils/url';

const baseUrl = 'https://report.example.com/index.html';

describe('getSafeReportUrl', () => {
  it('allows same-origin HTTP(S) report paths', () => {
    expect(getSafeReportUrl('./child.html', baseUrl)).toBe(
      'https://report.example.com/child.html',
    );
  });

  it('rejects executable and cross-origin URLs', () => {
    expect(
      getSafeReportUrl('javascript:alert(document.domain)//.html', baseUrl),
    ).toBeUndefined();
    expect(getSafeReportUrl('data:text/html,alert(1)', baseUrl)).toBeUndefined();
    expect(getSafeReportUrl('https://attacker.example/report.html', baseUrl)).toBeUndefined();
  });
});
