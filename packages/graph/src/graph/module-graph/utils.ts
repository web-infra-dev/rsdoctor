import type { SDK } from '@rsdoctor/types';
import { Lodash } from '@rsdoctor/utils/common';

export function isSamePosition(
  po1: SDK.SourcePosition,
  po2: SDK.SourcePosition,
) {
  return po1.line === po2.line && po1.column === po2.column;
}

export function isSameRange(po1: SDK.SourceRange, po2: SDK.SourceRange) {
  if (!isSamePosition(po1.start, po2.start)) {
    return false;
  }

  if (!Lodash.isNil(po1.end) && !Lodash.isNil(po2.end)) {
    return isSamePosition(po1.end, po2.end);
  }

  return Lodash.isUndefined(po1.end) && Lodash.isUndefined(po2.end);
}

/**
 * The following code is modified based on
 * https://github.com/relative-ci/bundle-stats/blob/master/packages/utils/src/webpack/utils.js#L63
 *
 * MIT Licensed
 * Author Viorel Cojocaru
 * Copyright 2019 Viorel Cojocaru, contributors.
 * https://github.com/relative-ci/bundle-stats/blob/master/LICENSE.md
 */
// css ./node_modules/css-loader/dist/cjs.js??ref--6-0!./src/assets/styles/default.styl
const NAME_WITH_LOADERS = /!/;

// ./src/index.jsx + 27 modules
const NAME_WITH_MODULES = /\s\+\s\d*\smodules$/;

// css ../node_modules../node_modules/package-a
const INVALID_CSS_PREFIX = /^css\s.*node_modules(?!\/)/;

export function getModuleName(name?: string) {
  if (!name) {
    return '';
  }

  if (NAME_WITH_LOADERS.test(name)) {
    const normalizedName = Lodash.last(name.split(NAME_WITH_LOADERS));

    if (normalizedName?.trim()) {
      return normalizedName;
    }
  }

  if (NAME_WITH_MODULES.test(name)) {
    return name.replace(NAME_WITH_MODULES, '');
  }

  if (INVALID_CSS_PREFIX.test(name)) {
    return name.replace(INVALID_CSS_PREFIX, '');
  }

  return name;
}

/**
 * Parse location string from Rspack side effect location
 * Supports formats:
 * - "line:column" -> { startLine, startColumn }
 * - "startLine:startColumn-endLine:endColumn" -> full range (e.g. 3:1-7:2)
 * - "line:startColumn-endColumn" -> single-line range (e.g. 11:72-285)
 * - "startLine-endLine:endColumn" -> start column omitted (e.g. 1-7:2)
 * - "startLine-endLine" -> line range only
 */
export function parseLocation(location: string): {
  startLine: number;
  startColumn: number;
  endLine?: number;
  endColumn?: number;
} | null {
  if (!location || typeof location !== 'string') return null;
  const s = location.trim();
  if (!s) return null;

  // "startLine:startColumn-endLine:endColumn" (e.g. 3:1-7:2)
  const fullRange = s.match(/^(\d+):(\d+)-(\d+):(\d+)$/);
  if (fullRange) {
    return {
      startLine: parseInt(fullRange[1], 10),
      startColumn: parseInt(fullRange[2], 10),
      endLine: parseInt(fullRange[3], 10),
      endColumn: parseInt(fullRange[4], 10),
    };
  }

  // "line:startColumn-endColumn" (single-line range, e.g. 11:72-285)
  // Must be checked before "startLine:startColumn-endLine" so that 11:72-285
  // is parsed as line 11 cols 72-285, not line 11 to line 285.
  const singleLineRange = s.match(/^(\d+):(\d+)-(\d+)$/);
  if (singleLineRange) {
    const startLine = parseInt(singleLineRange[1], 10);
    const startColumn = parseInt(singleLineRange[2], 10);
    const endColumn = parseInt(singleLineRange[3], 10);
    return {
      startLine,
      startColumn,
      endLine: startLine,
      endColumn,
    };
  }

  // "startLine-endLine:endColumn" (start column omitted, e.g. 1-7:2)
  const endColOnly = s.match(/^(\d+)-(\d+):(\d+)$/);
  if (endColOnly) {
    return {
      startLine: parseInt(endColOnly[1], 10),
      startColumn: 0,
      endLine: parseInt(endColOnly[2], 10),
      endColumn: parseInt(endColOnly[3], 10),
    };
  }

  // "startLine-endLine" (line range only)
  const lineRange = s.match(/^(\d+)-(\d+)$/);
  if (lineRange) {
    return {
      startLine: parseInt(lineRange[1], 10),
      startColumn: 0,
      endLine: parseInt(lineRange[2], 10),
    };
  }

  // "line:column" (point)
  const point = s.match(/^(\d+):(\d+)$/);
  if (point) {
    return {
      startLine: parseInt(point[1], 10),
      startColumn: parseInt(point[2], 10),
    };
  }

  return null;
}

/**
 * Extract code snippet from source based on location
 * @param source The source code string
 * @param location Parsed location object
 * @returns Extracted code snippet
 */
export function extractCodeFromLocation(
  source: string,
  location: ReturnType<typeof parseLocation>,
): string {
  if (!source || !location) return '';

  const lines = source.split('\n');
  const {
    startLine,
    startColumn: OriginalStartColumn,
    endLine,
    endColumn,
  } = location;

  let startColumn = OriginalStartColumn;
  if (OriginalStartColumn) {
    startColumn = OriginalStartColumn - 1;
  }

  // Handle single line
  if (!endLine || startLine === endLine) {
    const line = lines[startLine - 1]; // Line numbers are 1-indexed
    if (!line) return '';

    if (endColumn !== undefined) {
      return line.substring(startColumn, endColumn);
    }
    return line.substring(startColumn);
  }

  // Handle multiple lines
  const result: string[] = [];
  for (let i = startLine - 1; i < Math.min(endLine, lines.length); i++) {
    const line = lines[i];
    if (i === startLine - 1) {
      // First line: from startColumn to end
      result.push(line.substring(startColumn));
    } else if (i === endLine - 1) {
      // Last line: from start to endColumn
      result.push(
        endColumn !== undefined ? line.substring(0, endColumn) : line,
      );
    } else {
      // Middle lines: entire line
      result.push(line);
    }
  }

  return result.join('\n');
}
