import { expect, describe, it } from '@rstest/core';
import {
  getModuleName,
  parseLocation,
  extractCodeFromLocation,
} from '../src/graph/module-graph/utils';
import { readPackageJson } from '../src/graph/package-graph/utils';
import { join } from 'path';
import fse from 'fs-extra';
/**
 * The following code is modified based on
 * https://github.com/relative-ci/bundle-stats/blob/master/packages/utils/src/webpack/__tests__/utils-get-module-name.js
 *
 * MIT Licensed
 * Author Viorel Cojocaru
 * Copyright 2019 Viorel Cojocaru, contributors.
 * https://github.com/relative-ci/bundle-stats/blob/master/LICENSE.md
 */
describe('Webpack/utils/getModuleName', () => {
  it('should return empty name if missing', () => {
    expect(getModuleName()).toBe('');
  });

  it('should return name as it is', () => {
    expect(getModuleName('./node_modules/lodash/_apply.js')).toBe(
      './node_modules/lodash/_apply.js',
    );
  });

  it('should remove loader details', () => {
    expect(
      getModuleName(
        '!babel-loader!eslint-loader!./node_modules/lodash/_apply.js',
      ),
    ).toBe('./node_modules/lodash/_apply.js');
    expect(
      getModuleName(
        '!babel-loader!eslint-loader!./node_modules/lodash/_apply.js',
      ),
    ).toBe('./node_modules/lodash/_apply.js');
    expect(
      getModuleName('plugin/src/loader.js?{"modules":["./src/main.js"]}!'),
    ).toBe('plugin/src/loader.js?{"modules":["./src/main.js"]}!');
  });

  it('should remove webpack module details', () => {
    expect(getModuleName('./node_modules/lodash/_apply.js + 7 modules')).toBe(
      './node_modules/lodash/_apply.js',
    );
  });

  it('should remove invalid node_modules prefix', () => {
    expect(
      getModuleName('css ../node_modules../node_modules/package-a/style.css'),
    ).toBe('../node_modules/package-a/style.css');
  });
});

describe('parseLocation', () => {
  // ── Format: "line:column" (point) ──────────────────────────────────────────
  describe('format "line:column" (point)', () => {
    it('parses a basic point location', () => {
      expect(parseLocation('5:10')).toEqual({ startLine: 5, startColumn: 10 });
    });
  });

  // ── Format: "startLine:startColumn-endLine:endColumn" (full range) ─────────
  describe('format "startLine:startColumn-endLine:endColumn" (full range)', () => {
    it('parses a standard full range', () => {
      expect(parseLocation('3:1-7:2')).toEqual({
        startLine: 3,
        startColumn: 1,
        endLine: 7,
        endColumn: 2,
      });
    });
  });

  // ── Format: "line:startColumn-endColumn" (single-line column range) ────────
  describe('format "line:startColumn-endColumn" (single-line range)', () => {
    it('parses the canonical example 11:72-285', () => {
      expect(parseLocation('11:72-285')).toEqual({
        startLine: 11,
        startColumn: 72,
        endLine: 11,
        endColumn: 285,
      });
    });
  });

  // ── Format: "startLine-endLine:endColumn" (start column omitted) ───────────
  describe('format "startLine-endLine:endColumn" (start column omitted)', () => {
    it('parses the canonical example 1-7:2', () => {
      expect(parseLocation('1-7:2')).toEqual({
        startLine: 1,
        startColumn: 0,
        endLine: 7,
        endColumn: 2,
      });
    });
  });

  // ── Format: "startLine-endLine" (line range only) ─────────────────────────
  describe('format "startLine-endLine" (line range only)', () => {
    it('parses a plain line range', () => {
      expect(parseLocation('1-10')).toEqual({
        startLine: 1,
        startColumn: 0,
        endLine: 10,
      });
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────────────
  describe('edge cases', () => {
    it('returns null for an empty string', () => {
      expect(parseLocation('')).toBeNull();
    });

    it('returns null for a whitespace-only string', () => {
      expect(parseLocation('   ')).toBeNull();
    });

    it('returns null for an unrecognised format', () => {
      expect(parseLocation('abc')).toBeNull();
      expect(parseLocation('foo:bar')).toBeNull();
      expect(parseLocation('5')).toBeNull(); // single number
      expect(parseLocation(':10')).toBeNull(); // missing line
    });
  });
});

describe('extractCodeFromLocation', () => {
  const SOURCE = 'ABCDE\nFGHIJ\nKLMNO\nPQRST\nUVWXY';
  // lines (1-indexed):
  //   1 → "ABCDE"
  //   2 → "FGHIJ"
  //   3 → "KLMNO"
  //   4 → "PQRST"
  //   5 → "UVWXY"

  // ── Guard conditions ───────────────────────────────────────────────────────
  describe('guard conditions', () => {
    it('returns empty string when source is empty', () => {
      expect(
        extractCodeFromLocation('', { startLine: 1, startColumn: 0 }),
      ).toBe('');
    });

    it('returns empty string when location is null', () => {
      expect(extractCodeFromLocation(SOURCE, null)).toBe('');
    });
  });

  // ── Point location (no endLine, no endColumn) ─────────────────────────────
  describe('point location (startLine + startColumn only)', () => {
    it('returns from startColumn to end of line (column 1-indexed → adjusted)', () => {
      // startColumn 1 → adjusted to 0 → "ABCDE".substring(0) = "ABCDE"
      expect(
        extractCodeFromLocation(SOURCE, { startLine: 1, startColumn: 1 }),
      ).toBe('ABCDE');
    });
  });

  // ── Single-line with endColumn ────────────────────────────────────────────
  describe('single-line range (startLine === endLine)', () => {
    it('extracts a substring using startColumn and endColumn', () => {
      // startColumn 1 → adjusted 0; endColumn 3 → used as-is
      // "ABCDE".substring(0, 3) = "ABC"
      expect(
        extractCodeFromLocation(SOURCE, {
          startLine: 1,
          startColumn: 1,
          endLine: 1,
          endColumn: 3,
        }),
      ).toBe('ABC');
    });
  });

  // ── Multi-line range ───────────────────────────────────────────────────────
  describe('multi-line range', () => {
    it('extracts first-line suffix, full middle lines, and last-line prefix', () => {
      // startLine=1, startColumn=3 (→2), endLine=3, endColumn=3
      // line1: "ABCDE".substring(2) = "CDE"
      // line2: "FGHIJ" (full)
      // line3: "KLMNO".substring(0, 3) = "KLM"
      expect(
        extractCodeFromLocation(SOURCE, {
          startLine: 1,
          startColumn: 3,
          endLine: 3,
          endColumn: 3,
        }),
      ).toBe('CDE\nFGHIJ\nKLM');
    });
  });

  // ── Out-of-range line ──────────────────────────────────────────────────────
  describe('out-of-range line numbers', () => {
    it('returns empty string when startLine exceeds total line count', () => {
      expect(
        extractCodeFromLocation('one line', { startLine: 5, startColumn: 0 }),
      ).toBe('');
    });
  });
});

describe('readPackageJson util', () => {
  it('readPackageJson util', () => {
    expect(
      readPackageJson(join(__dirname, './fixture/index/index.js'), (file) => {
        try {
          return fse.readJsonSync(file, { encoding: 'utf8' });
        } catch (e) {
          // console.log(e)
        }
      }),
    ).toMatchSnapshot();
  });
});
