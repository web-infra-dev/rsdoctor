import { editor } from 'monaco-editor';
import { DefaultEditorConfig } from '../CodeViewer/utils';

const OptimizedDiffEditorConfig: editor.IDiffEditorConstructionOptions = {
  ...structuredClone(DefaultEditorConfig),
  /** 设置编辑器为只读模式，禁止用户修改内容 */
  readOnly: true,
  /** 设置原始文本区域不可编辑 */
  originalEditable: false,
  /** 启用并排视图模式，左右显示对比内容 */
  renderSideBySide: true,
  /** 并排展示模式自动切换断点设为 1, 等效禁用自动切换 */
  renderSideBySideInlineBreakpoint: 1,
  /** 显示差异指示器（在行号旁边的颜色标记） */
  renderIndicators: true,
  /** 点击定义链接时不使用内嵌预览，而是直接打开 */
  definitionLinkOpensInPeek: false,
  /** DOM元素设为只读，增强安全性 */
  domReadOnly: true,
  /** 禁用右侧的代码缩略图以提高性能 */
  minimap: { enabled: false },
  /** 启用自动换行，使长行文本在视图中完整显示 */
  diffWordWrap: 'on',

  // 性能优化项
  /** 禁用代码折叠，减少不必要的计算 */
  folding: false,
  /** 禁用行号边距悬停效果，提高渲染性能 */
  lineNumbersMinChars: 3,
  /** 减少渲染外部装饰物，提高性能 */
  renderLineHighlight: 'none',
  /** 禁用括号匹配高亮，减少计算 */
  matchBrackets: 'never',

  // 展示效果优化
  /** 启用差异算法的高级配置，提高差异显示的准确性 */
  diffAlgorithm: 'advanced',
  /** 忽略空格变化，专注于内容差异 */
  ignoreTrimWhitespace: true,
  /** 启用差异代码块之间的连线，提高可读性 */
  renderOverviewRuler: true,
  /** 高亮当前行，增强可读性 */
  renderLineHighlightOnlyWhenFocus: true,
  /** 启用平滑滚动效果 */
  smoothScrolling: true,
  /** 设置适当的字体间距，提高可读性 */
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
