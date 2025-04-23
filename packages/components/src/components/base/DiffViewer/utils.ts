import { editor } from 'monaco-editor';
import { DefaultEditorConfig } from '../CodeViewer/utils';
const OptimizedDiffEditorConfig: editor.IDiffEditorConstructionOptions = {
  ...structuredClone(DefaultEditorConfig),
  readOnly: true,
  originalEditable: false,
  // Enable side-by-side view mode, displaying comparison content left and right
  renderSideBySide: true,
  // Set the automatic switching breakpoint for side-by-side display to 1,
  // disabling auto-switching
  renderSideBySideInlineBreakpoint: 1,
  renderIndicators: true,
  definitionLinkOpensInPeek: false,
  // Set DOM elements to read-only, enhancing security
  domReadOnly: true,
  // Disable the code minimap on the right to improve performance
  minimap: { enabled: false },
  // Enable word wrap to display long lines of text completely in the view
  diffWordWrap: 'on',

  // Performance optimization items
  // Disable code folding to reduce unnecessary calculations
  folding: false,
  // Disable line number margin hover effects to improve rendering performance
  lineNumbersMinChars: 3,
  // Reduce rendering of external decorations to improve performance
  renderLineHighlight: 'none',
  // Disable bracket matching highlighting to reduce computation
  matchBrackets: 'never',

  // Display effect optimizations
  // Enable advanced configuration for the difference algorithm to improve accuracy of difference display
  diffAlgorithm: 'advanced',
  // Ignore whitespace changes to focus on content differences
  ignoreTrimWhitespace: true,
  // Enable connecting lines between different code blocks to improve readability
  renderOverviewRuler: true,
  // Highlight the current line to enhance readability
  renderLineHighlightOnlyWhenFocus: true,
  // Enable smooth scrolling effect
  smoothScrolling: true,
  // Set appropriate letter spacing to improve readability
  letterSpacing: 0.5,
};

/**
 * get monaco options, it'll combine default config
 * @param options
 * @returns target options
 */
export function defineMonacoDiffOptions(
  options?: editor.IDiffEditorConstructionOptions,
): editor.IDiffEditorConstructionOptions {
  return {
    ...structuredClone(OptimizedDiffEditorConfig),
    ...options,
  };
}
