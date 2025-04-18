import { editor } from 'monaco-editor';
import { extname } from 'path';

/**
 * 判断 data 协议文件格式
 * @param {string} content 文件内容
 * @returns {string} 文件格式类型
 */
function getDataProtocolFormat(content: string): string {
  // 如果内容为空返回空
  if (!content) {
    return '';
  }

  try {
    const prefix = 'data:';
    // 检查是否以 data: 开头
    if (!content.startsWith(prefix)) {
      return '';
    }

    const prefixLength = prefix.length;
    const endIndex = content.indexOf(';', prefixLength);
    if (endIndex === -1) return '';

    // 提取 MIME 类型
    const mimeType = content.substring(prefixLength, endIndex);

    // 根据 MIME 类型返回对应的格式
    switch (mimeType) {
      case 'text/javascript':
        return 'javascript';
      case 'text/html':
        return 'html';
      case 'text/css':
        return 'css';
      case 'text/plain':
        return 'text';
      case 'application/json':
        return 'json';
      // 可以根据需要添加更多类型
      default:
        return '';
    }
  } catch (error) {
    console.error('解析 data 协议文件格式失败:', error);
    return '';
  }
}

export function getFilePathFormat(filePath: string): string {
  if (!filePath) return '';

  const i = getDataProtocolFormat(filePath);

  if (i) {
    return i;
  }

  try {
    const ext = extname(filePath).slice(1);
    switch (ext) {
      case 'js':
      case 'cjs':
      case 'mjs':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      default:
        return ext;
    }
  } catch (e) {
    return '';
  }
}

// // 使用示例:
// const testCases = [
//   'data:text/javascript;console.log("Hello")',
//   'data:text/html;<h1>Hello</h1>',
//   'data:text/css;body { color: red; }',
//   'data:application/json;{"name": "test"}',
//   'data:invalid;content',
//   'invalid content',
// ];

// testCases.forEach((content) => {
//   console.log(`Content: ${content}`);
//   console.log(`Format: ${getDataProtocolFormat(content)}\n`);
// });

/**
 * 默认编辑器样式, 适合预览代码
 */
const DefaultEditorConfig: editor.IStandaloneEditorConstructionOptions = {
  // 设置编辑器为只读模式
  readOnly: true,
  // 设置 DOM 元素为只读模式
  domReadOnly: true,
  // 设置字体大小为 14px
  fontSize: 14,
  // 设置制表符宽度为 2 个空格
  tabSize: 2,
  // 设置行高为 24px
  lineHeight: 24,
  // 关闭验证装饰器的渲染(如错误、警告标记等)
  renderValidationDecorations: 'off',
  // 在概览标尺中隐藏光标
  hideCursorInOverviewRuler: true,
  // 启用平滑滚动
  smoothScrolling: true,
  // 设置文本换行方式
  wordWrap: 'on',
  // 启用颜色装饰器(如显示颜色预览)
  colorDecorators: true,
  // 禁用代码镜头功能(如显示引用次数等)
  codeLens: false,
  // 设置光标宽度为 0(隐藏光标)
  cursorWidth: 0,
  // 禁用右侧的小地图预览
  minimap: {
    enabled: false,
  },
};

/**
 * get monaco options, it'll combine default config
 * @param options
 * @returns target options
 */
export function defineMonacoOptions(
  options?: editor.IStandaloneEditorConstructionOptions,
): editor.IStandaloneEditorConstructionOptions {
  return {
    ...structuredClone(DefaultEditorConfig),
    ...options,
  };
}

export function getFileName(filePath: string): string {
  // 如果内容为空返回空
  if (!filePath) {
    return '';
  }

  const prefix = 'data:';
  // 检查是否以 data: 开头
  if (filePath.startsWith(prefix)) {
    return 'data';
  }

  return filePath.split('/').at(-1) || '';
}
