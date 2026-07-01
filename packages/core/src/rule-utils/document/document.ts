import { Lodash } from '@rsdoctor/core/common';
import { LinesAndColumns } from 'lines-and-columns';
import { Range, OffsetRange, Position, DocumentEditData } from './types';

/** Document Catalogue */
export class Document {
  /** Actual document content. */
  private _text = '';

  /** Get the displacement of the file position in the text. */
  positionAt!: (offset: number) => Position | undefined;

  /** Get the position of the displacement point in the file. */
  offsetAt!: (position: Position) => number | undefined;

  constructor(content: string) {
    this._text = content;
    this.createFinder();
  }

  /** Generate location search */
  private createFinder() {
    const find = new LinesAndColumns(this._text);

    this.positionAt = (offset) => {
      if (offset >= this._text.length) {
        offset = this._text.length - 1;
      }

      if (offset < 0) {
        offset = 0;
      }

      const result = find.locationForIndex(offset);

      if (!result) {
        return;
      }

      return {
        line: result.line + 1,
        column: result.column,
      };
    };

    this.offsetAt = (position) => {
      return (
        find.indexForLocation({
          line: position.line - 1,
          column: position.column,
        }) ?? undefined
      );
    };
  }

  getText(range?: Range | OffsetRange) {
    if (!range) {
      return this._text;
    }

    const start =
      typeof range.start === 'number'
        ? range.start
        : this.offsetAt(range.start);
    const end =
      typeof range.end === 'number' ? range.end : this.offsetAt(range.end);

    if (Lodash.isUndefined(start)) {
      throw new Error(`Location ${JSON.stringify(start)} is illegal`);
    }

    if (Lodash.isUndefined(end)) {
      throw new Error(`Location ${JSON.stringify(end)} is illegal`);
    }

    return this._text.slice(start, end);
  }

  /** Edit document data */
  edit(data: DocumentEditData) {
    let { _text: content } = this;
    const startOffset = Lodash.isNumber(data.start)
      ? data.start
      : this.offsetAt(data.start);
    const endOffset = Lodash.isNumber(data.end)
      ? data.end
      : this.offsetAt(data.end);

    if (Lodash.isUndefined(startOffset) || Lodash.isUndefined(endOffset)) {
      return;
    }

    const startTxt = content.substring(0, startOffset);
    const endTxt = content.substring(endOffset, content.length);

    content = startTxt + data.newText + endTxt;

    return content;
  }
}
