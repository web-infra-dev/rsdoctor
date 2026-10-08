import { describe, expect, it } from 'rstack/test';
import { getSafeReportOrigin, getSafeReportUrl } from 'src/utils/url';

const baseUrl = 'https://report.example.com/index.html';
const fileBaseUrl = 'file:///reports/index.html';

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
    expect(
      getSafeReportUrl('data:text/html,alert(1)', baseUrl),
    ).toBeUndefined();
    expect(
      getSafeReportUrl('https://attacker.example/report.html', baseUrl),
    ).toBeUndefined();
  });

  it('allows relative file-based report paths only', () => {
    expect(getSafeReportUrl('./child.html', fileBaseUrl)).toBe(
      'file:///reports/child.html',
    );
    expect(getSafeReportUrl('../other/child.html', fileBaseUrl)).toBe(
      'file:///other/child.html',
    );
    expect(
      getSafeReportUrl('file:///private/report.html', fileBaseUrl),
    ).toBeUndefined();
    expect(
      getSafeReportUrl('javascript:alert(1)', fileBaseUrl),
    ).toBeUndefined();
  });

  it.each([
    '/private/report.html',
    '//server/share/report.html',
    '\\\\server\\share\\report.html',
    './\\\\server\\share\\report.html',
    ' file:///private/report.html',
    'fi\tle:///private/report.html',
  ])('rejects absolute or ambiguous file path %s', (path) => {
    expect(getSafeReportUrl(path, fileBaseUrl)).toBeUndefined();
  });
});

describe('getSafeReportOrigin', () => {
  it('allows HTTP(S) origins', () => {
    expect(getSafeReportOrigin('https://report.example.com/path')).toBe(
      'https://report.example.com',
    );
  });

  it.each(['javascript:alert(1)', 'data:text/html,alert(1)', 'file:///report'])(
    'rejects unsafe origin %s',
    (origin) => {
      expect(getSafeReportOrigin(origin)).toBeUndefined();
    },
  );
});
