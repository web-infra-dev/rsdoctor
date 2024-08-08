/**
 * The following is modified based on source found in
 * https://github.com/microsoft/monaco-editor
 *
 * MIT Licensed
 * Copyright (c) 2016 - present Microsoft Corporation
 * https://github.com/microsoft/monaco-editor/blob/main/LICENSE.txt
 */

export class Range {
  public startLineNumber: number;
  public startColumn: number;
  public endLineNumber: number;
  public endColumn: number;

  constructor(
    startLineNumber: number,
    startColumn: number,
    endLineNumber: number,
    endColumn: number,
  ) {
    if (
      startLineNumber > endLineNumber ||
      (startLineNumber === endLineNumber && startColumn > endColumn)
    ) {
      this.startLineNumber = endLineNumber;
      this.startColumn = endColumn;
      this.endLineNumber = startLineNumber;
      this.endColumn = startColumn;
    } else {
      this.startLineNumber = startLineNumber;
      this.startColumn = startColumn;
      this.endLineNumber = endLineNumber;
      this.endColumn = endColumn;
    }
  }
  /**
   * Test if this range is empty.
   */
  isEmpty() {
    return Range.isEmpty(this);
  }
  /**
   * Test if `range` is empty.
   */
  static isEmpty(range: Range) {
    return (
      range.startLineNumber === range.endLineNumber &&
      range.startColumn === range.endColumn
    );
  }
  /**
   * Test if position is in this range. If the position is at the edges, will return true.
   */
  containsPosition(position: any) {
    return Range.containsPosition(this, position);
  }
  /**
   * Test if `position` is in `range`. If the position is at the edges, will return true.
   */
  static containsPosition(
    range: Range,
    position: {
      lineNumber: number;
      column: number;
    },
  ) {
    if (
      position.lineNumber < range.startLineNumber ||
      position.lineNumber > range.endLineNumber
    ) {
      return false;
    }
    if (
      position.lineNumber === range.startLineNumber &&
      position.column < range.startColumn
    ) {
      return false;
    }
    if (
      position.lineNumber === range.endLineNumber &&
      position.column > range.endColumn
    ) {
      return false;
    }
    return true;
  }
  /**
   * Test if `position` is in `range`. If the position is at the edges, will return false.
   * @internal
   */
  static strictContainsPosition(
    range: Range,
    position: {
      lineNumber: number;
      column: number;
    },
  ) {
    if (
      position.lineNumber < range.startLineNumber ||
      position.lineNumber > range.endLineNumber
    ) {
      return false;
    }
    if (
      position.lineNumber === range.startLineNumber &&
      position.column <= range.startColumn
    ) {
      return false;
    }
    if (
      position.lineNumber === range.endLineNumber &&
      position.column >= range.endColumn
    ) {
      return false;
    }
    return true;
  }
  /**
   * Test if range is in this range. If the range is equal to this range, will return true.
   */
  containsRange(range: Range) {
    return Range.containsRange(this, range);
  }
  /**
   * Test if `otherRange` is in `range`. If the ranges are equal, will return true.
   */
  static containsRange(
    range: Range,
    otherRange: {
      startLineNumber: number;
      endLineNumber: number;
      startColumn: number;
      endColumn: number;
    },
  ) {
    if (
      otherRange.startLineNumber < range.startLineNumber ||
      otherRange.endLineNumber < range.startLineNumber
    ) {
      return false;
    }
    if (
      otherRange.startLineNumber > range.endLineNumber ||
      otherRange.endLineNumber > range.endLineNumber
    ) {
      return false;
    }
    if (
      otherRange.startLineNumber === range.startLineNumber &&
      otherRange.startColumn < range.startColumn
    ) {
      return false;
    }
    if (
      otherRange.endLineNumber === range.endLineNumber &&
      otherRange.endColumn > range.endColumn
    ) {
      return false;
    }
    return true;
  }
  /**
   * Test if `range` is strictly in this range. `range` must start after and end before this range for the result to be true.
   */
  strictContainsRange(range: Range) {
    return Range.strictContainsRange(this, range);
  }
  /**
   * Test if `otherRange` is strictly in `range` (must start after, and end before). If the ranges are equal, will return false.
   */
  static strictContainsRange(
    range: Range,
    otherRange: {
      startLineNumber: number;
      endLineNumber: number;
      startColumn: number;
      endColumn: number;
    },
  ) {
    if (
      otherRange.startLineNumber < range.startLineNumber ||
      otherRange.endLineNumber < range.startLineNumber
    ) {
      return false;
    }
    if (
      otherRange.startLineNumber > range.endLineNumber ||
      otherRange.endLineNumber > range.endLineNumber
    ) {
      return false;
    }
    if (
      otherRange.startLineNumber === range.startLineNumber &&
      otherRange.startColumn <= range.startColumn
    ) {
      return false;
    }
    if (
      otherRange.endLineNumber === range.endLineNumber &&
      otherRange.endColumn >= range.endColumn
    ) {
      return false;
    }
    return true;
  }
  /**
   * A reunion of the two ranges.
   * The smallest position will be used as the start point, and the largest one as the end point.
   */
  plusRange(range: Range) {
    return Range.plusRange(this, range);
  }
  /**
   * A reunion of the two ranges.
   * The smallest position will be used as the start point, and the largest one as the end point.
   */
  static plusRange(a: Range, b: Range) {
    let startLineNumber;
    let startColumn;
    let endLineNumber;
    let endColumn;
    if (b.startLineNumber < a.startLineNumber) {
      startLineNumber = b.startLineNumber;
      startColumn = b.startColumn;
    } else if (b.startLineNumber === a.startLineNumber) {
      startLineNumber = b.startLineNumber;
      startColumn = Math.min(b.startColumn, a.startColumn);
    } else {
      startLineNumber = a.startLineNumber;
      startColumn = a.startColumn;
    }
    if (b.endLineNumber > a.endLineNumber) {
      endLineNumber = b.endLineNumber;
      endColumn = b.endColumn;
    } else if (b.endLineNumber === a.endLineNumber) {
      endLineNumber = b.endLineNumber;
      endColumn = Math.max(b.endColumn, a.endColumn);
    } else {
      endLineNumber = a.endLineNumber;
      endColumn = a.endColumn;
    }
    return new Range(startLineNumber, startColumn, endLineNumber, endColumn);
  }
  /**
   * A intersection of the two ranges.
   */
  intersectRanges(range: Range) {
    return Range.intersectRanges(this, range);
  }
  /**
   * A intersection of the two ranges.
   */
  static intersectRanges(a: Range, b: Range) {
    let resultStartLineNumber = a.startLineNumber;
    let resultStartColumn = a.startColumn;
    let resultEndLineNumber = a.endLineNumber;
    let resultEndColumn = a.endColumn;
    const otherStartLineNumber = b.startLineNumber;
    const otherStartColumn = b.startColumn;
    const otherEndLineNumber = b.endLineNumber;
    const otherEndColumn = b.endColumn;
    if (resultStartLineNumber < otherStartLineNumber) {
      resultStartLineNumber = otherStartLineNumber;
      resultStartColumn = otherStartColumn;
    } else if (resultStartLineNumber === otherStartLineNumber) {
      resultStartColumn = Math.max(resultStartColumn, otherStartColumn);
    }
    if (resultEndLineNumber > otherEndLineNumber) {
      resultEndLineNumber = otherEndLineNumber;
      resultEndColumn = otherEndColumn;
    } else if (resultEndLineNumber === otherEndLineNumber) {
      resultEndColumn = Math.min(resultEndColumn, otherEndColumn);
    }
    // Check if selection is now empty
    if (resultStartLineNumber > resultEndLineNumber) {
      return null;
    }
    if (
      resultStartLineNumber === resultEndLineNumber &&
      resultStartColumn > resultEndColumn
    ) {
      return null;
    }
    return new Range(
      resultStartLineNumber,
      resultStartColumn,
      resultEndLineNumber,
      resultEndColumn,
    );
  }
  /**
   * Test if this range equals other.
   */
  equalsRange(other: Range) {
    return Range.equalsRange(this, other);
  }
  /**
   * Test if range `a` equals `b`.
   */
  static equalsRange(a: Range, b: Range) {
    if (!a && !b) {
      return true;
    }
    return (
      !!a &&
      !!b &&
      a.startLineNumber === b.startLineNumber &&
      a.startColumn === b.startColumn &&
      a.endLineNumber === b.endLineNumber &&
      a.endColumn === b.endColumn
    );
  }
  /**
   * Return the end position (which will be after or equal to the start position)
   */
  getEndPosition() {
    return Range.getEndPosition(this);
  }
  /**
   * Return the end position (which will be after or equal to the start position)
   */
  static getEndPosition(range: Range) {
    return new Position(range.endLineNumber, range.endColumn);
  }
  /**
   * Return the start position (which will be before or equal to the end position)
   */
  getStartPosition() {
    return Range.getStartPosition(this);
  }
  /**
   * Return the start position (which will be before or equal to the end position)
   */
  static getStartPosition(range: Range) {
    return new Position(range.startLineNumber, range.startColumn);
  }
  /**
   * Transform to a user presentable string representation.
   */
  toString() {
    return `[${this.startLineNumber},${this.startColumn} -> ${this.endLineNumber},${this.endColumn}]`;
  }
  /**
   * Create a new range using this range's start position, and using endLineNumber and endColumn as the end position.
   */
  setEndPosition(endLineNumber: number, endColumn: number) {
    return new Range(
      this.startLineNumber,
      this.startColumn,
      endLineNumber,
      endColumn,
    );
  }
  /**
   * Create a new range using this range's end position, and using startLineNumber and startColumn as the start position.
   */
  setStartPosition(startLineNumber: number, startColumn: number) {
    return new Range(
      startLineNumber,
      startColumn,
      this.endLineNumber,
      this.endColumn,
    );
  }
  /**
   * Create a new empty range using this range's start position.
   */
  collapseToStart() {
    return Range.collapseToStart(this);
  }
  /**
   * Create a new empty range using this range's start position.
   */
  static collapseToStart(range: Range) {
    return new Range(
      range.startLineNumber,
      range.startColumn,
      range.startLineNumber,
      range.startColumn,
    );
  }
  /**
   * Create a new empty range using this range's end position.
   */
  collapseToEnd() {
    return Range.collapseToEnd(this);
  }
  /**
   * Create a new empty range using this range's end position.
   */
  static collapseToEnd(range: Range) {
    return new Range(
      range.endLineNumber,
      range.endColumn,
      range.endLineNumber,
      range.endColumn,
    );
  }
  /**
   * Moves the range by the given amount of lines.
   */
  delta(lineCount: number) {
    return new Range(
      this.startLineNumber + lineCount,
      this.startColumn,
      this.endLineNumber + lineCount,
      this.endColumn,
    );
  }
  // ---
  static fromPositions(
    start: {
      lineNumber: number;
      column: number;
    },
    end = start,
  ) {
    return new Range(
      start.lineNumber,
      start.column,
      end.lineNumber,
      end.column,
    );
  }
  static lift(range: Range) {
    if (!range) {
      return null;
    }
    return new Range(
      range.startLineNumber,
      range.startColumn,
      range.endLineNumber,
      range.endColumn,
    );
  }
  /**
   * Test if `obj` is an `IRange`.
   */
  static isIRange(obj: Range) {
    return (
      obj &&
      typeof obj.startLineNumber === 'number' &&
      typeof obj.startColumn === 'number' &&
      typeof obj.endLineNumber === 'number' &&
      typeof obj.endColumn === 'number'
    );
  }
  /**
   * Test if the two ranges are touching in any way.
   */
  static areIntersectingOrTouching(a: Range, b: Range) {
    // Check if `a` is before `b`
    if (
      a.endLineNumber < b.startLineNumber ||
      (a.endLineNumber === b.startLineNumber && a.endColumn < b.startColumn)
    ) {
      return false;
    }
    // Check if `b` is before `a`
    if (
      b.endLineNumber < a.startLineNumber ||
      (b.endLineNumber === a.startLineNumber && b.endColumn < a.startColumn)
    ) {
      return false;
    }
    // These ranges must intersect
    return true;
  }
  /**
   * Test if the two ranges are intersecting. If the ranges are touching it returns true.
   */
  static areIntersecting(a: Range, b: Range) {
    // Check if `a` is before `b`
    if (
      a.endLineNumber < b.startLineNumber ||
      (a.endLineNumber === b.startLineNumber && a.endColumn <= b.startColumn)
    ) {
      return false;
    }
    // Check if `b` is before `a`
    if (
      b.endLineNumber < a.startLineNumber ||
      (b.endLineNumber === a.startLineNumber && b.endColumn <= a.startColumn)
    ) {
      return false;
    }
    // These ranges must intersect
    return true;
  }
  /**
   * A function that compares ranges, useful for sorting ranges
   * It will first compare ranges on the startPosition and then on the endPosition
   */
  static compareRangesUsingStarts(a: Range, b: Range) {
    if (a && b) {
      const aStartLineNumber = a.startLineNumber | 0;
      const bStartLineNumber = b.startLineNumber | 0;
      if (aStartLineNumber === bStartLineNumber) {
        const aStartColumn = a.startColumn | 0;
        const bStartColumn = b.startColumn | 0;
        if (aStartColumn === bStartColumn) {
          const aEndLineNumber = a.endLineNumber | 0;
          const bEndLineNumber = b.endLineNumber | 0;
          if (aEndLineNumber === bEndLineNumber) {
            const aEndColumn = a.endColumn | 0;
            const bEndColumn = b.endColumn | 0;
            return aEndColumn - bEndColumn;
          }
          return aEndLineNumber - bEndLineNumber;
        }
        return aStartColumn - bStartColumn;
      }
      return aStartLineNumber - bStartLineNumber;
    }
    const aExists = a ? 1 : 0;
    const bExists = b ? 1 : 0;
    return aExists - bExists;
  }
  /**
   * A function that compares ranges, useful for sorting ranges
   * It will first compare ranges on the endPosition and then on the startPosition
   */
  static compareRangesUsingEnds(
    a: {
      endLineNumber: number;
      endColumn: number;
      startLineNumber: number;
      startColumn: number;
    },
    b: {
      endLineNumber: number;
      endColumn: number;
      startLineNumber: number;
      startColumn: number;
    },
  ) {
    if (a.endLineNumber === b.endLineNumber) {
      if (a.endColumn === b.endColumn) {
        if (a.startLineNumber === b.startLineNumber) {
          return a.startColumn - b.startColumn;
        }
        return a.startLineNumber - b.startLineNumber;
      }
      return a.endColumn - b.endColumn;
    }
    return a.endLineNumber - b.endLineNumber;
  }
  /**
   * Test if the range spans multiple lines.
   */
  static spansMultipleLines(range: Range) {
    return range.endLineNumber > range.startLineNumber;
  }
  toJSON() {
    return this;
  }
}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * A position in the editor.
 */
export class Position {
  lineNumber: number;
  column: number;

  constructor(lineNumber: number, column: number) {
    this.lineNumber = lineNumber;
    this.column = column;
  }
  /**
   * Create a new position from this position.
   *
   * @param newLineNumber new line number
   * @param newColumn new column
   */
  with(newLineNumber = this.lineNumber, newColumn = this.column) {
    if (newLineNumber === this.lineNumber && newColumn === this.column) {
      return this;
    }
    return new Position(newLineNumber, newColumn);
  }
  /**
   * Derive a new position from this position.
   *
   * @param deltaLineNumber line number delta
   * @param deltaColumn column delta
   */
  delta(deltaLineNumber = 0, deltaColumn = 0) {
    return this.with(
      this.lineNumber + deltaLineNumber,
      this.column + deltaColumn,
    );
  }
  /**
   * Test if this position equals other position
   */
  equals(other: any) {
    return Position.equals(this, other);
  }
  /**
   * Test if position `a` equals position `b`
   */
  static equals(
    a: any,
    b: {
      lineNumber: any;
      column: any;
    },
  ) {
    if (!a && !b) {
      return true;
    }
    return !!a && !!b && a.lineNumber === b.lineNumber && a.column === b.column;
  }
  /**
   * Test if this position is before other position.
   * If the two positions are equal, the result will be false.
   */
  isBefore(other: any) {
    return Position.isBefore(this, other);
  }
  /**
   * Test if position `a` is before position `b`.
   * If the two positions are equal, the result will be false.
   */
  static isBefore(
    a: any,
    b: {
      lineNumber: number;
      column: number;
    },
  ) {
    if (a.lineNumber < b.lineNumber) {
      return true;
    }
    if (b.lineNumber < a.lineNumber) {
      return false;
    }
    return a.column < b.column;
  }
  /**
   * Test if this position is before other position.
   * If the two positions are equal, the result will be true.
   */
  isBeforeOrEqual(other: any) {
    return Position.isBeforeOrEqual(this, other);
  }
  /**
   * Test if position `a` is before position `b`.
   * If the two positions are equal, the result will be true.
   */
  static isBeforeOrEqual(
    a: any,
    b: {
      lineNumber: number;
      column: number;
    },
  ) {
    if (a.lineNumber < b.lineNumber) {
      return true;
    }
    if (b.lineNumber < a.lineNumber) {
      return false;
    }
    return a.column <= b.column;
  }
  /**
   * A function that compares positions, useful for sorting
   */
  static compare(
    a: {
      lineNumber: number;
      column: number;
    },
    b: {
      lineNumber: number;
      column: number;
    },
  ) {
    const aLineNumber = a.lineNumber | 0;
    const bLineNumber = b.lineNumber | 0;
    if (aLineNumber === bLineNumber) {
      const aColumn = a.column | 0;
      const bColumn = b.column | 0;
      return aColumn - bColumn;
    }
    return aLineNumber - bLineNumber;
  }
  /**
   * Clone this position.
   */
  clone() {
    return new Position(this.lineNumber, this.column);
  }
  /**
   * Convert to a human-readable representation.
   */
  toString() {
    return `(${this.lineNumber},${this.column})`;
  }
  // ---
  /**
   * Create a `Position` from an `IPosition`.
   */
  static lift(pos: { lineNumber: any; column: any }) {
    return new Position(pos.lineNumber, pos.column);
  }
  /**
   * Test if `obj` is an `IPosition`.
   */
  static isIPosition(obj: { lineNumber: any; column: any }) {
    return (
      obj &&
      typeof obj.lineNumber === 'number' &&
      typeof obj.column === 'number'
    );
  }
  toJSON() {
    return {
      lineNumber: this.lineNumber,
      column: this.column,
    };
  }
}
