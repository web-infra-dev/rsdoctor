/* eslint-disable financial/no-float-calculation */
import { extname } from 'path';
import type { SDK } from '@rsdoctor/types';
import { loader } from '@monaco-editor/react';
import { isJsDataUrl } from './url';
import type { Range as RangeClass } from 'monaco-editor';

const monacoLoader = loader.init();

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

export function getRevealPositionForViewer(
  startLineNumber: number,
  startColumn: number,
) {
  return {
    lineNumber: Math.floor(startLineNumber / 1.2) || 1,
    column: Math.floor(startColumn / 1.5) || 1,
  };
}

export function getSelectionRange(
  source: SDK.SourceRange,
  Range: typeof RangeClass,
) {
  const { start, end } = source;
  const { line = 1, column = 0 } = start;
  return new Range(
    line,
    column + 1,
    end?.line ?? line,
    (end?.column ?? 9999) + 1,
  );
}

const initMonaco = (monacoRef: any) => {
  return new Promise<void>((resolve, reject) => {
    if (monacoRef.value) {
      resolve();
      return;
    }
    monacoLoader
      .then((monacoInstance: any) => {
        monacoRef.value = monacoInstance;
      })
      .catch((error: any) => {
        if (error?.type !== 'cancelation') {
          console.error('Monaco initialization error:', error);
          reject();
        }
      });
  });
};

export function useMonacoEditor() {
  return {
    initMonaco,
  };
}
