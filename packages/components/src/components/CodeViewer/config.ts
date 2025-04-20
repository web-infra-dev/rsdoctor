import type { editor } from 'monaco-editor';

/** @deprecated if you need get monacoConfig, please use defineMonacoOptions() in /base/CodeViewer/utils.ts */
export const DefaultEditorConfig: editor.IStandaloneEditorConstructionOptions =
  {
    readOnly: true,
    domReadOnly: true,
    fontSize: 12,
    renderValidationDecorations: 'off',
    hideCursorInOverviewRuler: true,
    smoothScrolling: true,
    wordWrap: 'bounded',
    colorDecorators: true,
    codeLens: false,
    cursorWidth: 0,
    minimap: {
      enabled: false,
    },
  };
