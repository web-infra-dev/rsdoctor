import { describe, expect, it } from 'rstack/test';
import { escapeHtml } from 'src/components/Charts/escapeHtml';

const payload = '<img src=x onerror=alert(1)>';

describe('chart tooltips', () => {
  it('escapes attacker-controlled values before interpolation', () => {
    expect(escapeHtml(payload)).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });
});
