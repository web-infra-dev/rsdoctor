/* eslint-disable financial/no-float-calculation */
import { extname } from 'path';
import type { SDK } from '@rsdoctor/types';
import type { Range as RangeClass } from 'monaco-editor';
import { isJsDataUrl } from './url';

export function getOriginalLanguage(filepath: string) {
  if (isJsDataUrl(filepath)) {
    return 'javascript';
  }

  const ext = extname(filepath).slice(1);
  switch (ext) {
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    default:
      return ext;
  }
}

export function getModifiedLanguage(filepath: string) {
  const ext = extname(filepath).slice(1);
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return 'javascript';
    default:
      return ext;
  }
}

export function getRevealPositionForViewer(startLineNumber: number, startColumn: number) {
  return {
    lineNumber: Math.floor(startLineNumber / 1.2) || 1,
    column: Math.floor(startColumn / 1.5) || 1,
  };
}

export function getSelectionRange(source: SDK.SourceRange, Range: typeof RangeClass) {
  const { start, end } = source;
  const { line = 1, column = 0 } = start;
  return new Range(line, column + 1, end?.line ?? line, (end?.column ?? 9999) + 1);
}
