import { Monaco } from '@monaco-editor/react';
import { SDK } from '@rsdoctor/types';
import { editor } from 'monaco-editor';
import { extname } from 'path';
import { getSelectionRange } from 'src/utils/monaco';

/**
 * 判断 data 协议文件格式 `data:[<mediatype>][;base64],<data>`
 * 完整协议: https://www.rfc-editor.org/rfc/rfc2397.html
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

    const { mimeType } = parseDataUrl(content);

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

/**
 * 解析 Data URL 并提取 MIME 类型
 * @param {string} dataUrl - 要解析的 Data URL 字符串
 * @returns {Object} 包含解析结果的对象
 */
function parseDataUrl(dataUrl: string) {
  // 检查是否是 Data URL
  if (!dataUrl.startsWith('data:')) {
    throw new Error('输入不是有效的 Data URL');
  }

  // 提取内容部分 (去掉 "data:" 前缀)
  const content = dataUrl.substring(5);

  // 查找分隔数据和元数据的逗号
  const commaIndex = content.indexOf(',');

  if (commaIndex === -1) {
    throw new Error('无效的 Data URL 格式: 缺少数据分隔符');
  }

  // 提取元数据部分
  const metadataPart = content.substring(0, commaIndex);

  // 提取数据部分
  const dataPart = content.substring(commaIndex + 1);

  // 解析元数据
  let mimeType = '';
  let charset = '';
  let isBase64 = false;

  // 分割元数据部分
  const metadataSegments = metadataPart.split(';');

  // 第一部分通常是 MIME 类型
  if (metadataSegments.length > 0) {
    mimeType = metadataSegments[0] || 'text/plain'; // 默认为 text/plain
  }

  // 检查其他元数据参数
  for (let i = 1; i < metadataSegments.length; i++) {
    const segment = metadataSegments[i];

    if (segment === 'base64') {
      isBase64 = true;
    } else if (segment.startsWith('charset=')) {
      charset = segment.substring(8);
    }
  }

  // 返回解析结果
  return {
    mimeType,
    charset,
    isBase64,
    data: dataPart,
  };
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
      case 'md':
        return 'markdown';
      default:
        return ext;
    }
  } catch (e) {
    return '';
  }
}

/**
 * 默认编辑器样式, 适合预览代码
 */
export const DefaultEditorConfig: editor.IStandaloneEditorConstructionOptions =
  {
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

    /** 禁用编辑器内置的右键菜单 */
    contextmenu: false,
    /** 禁用定义跳转功能 */
    gotoLocation: {
      multiple: 'goto',
      multipleDefinitions: 'goto',
      multipleTypeDefinitions: 'goto',
      multipleDeclarations: 'goto',
      multipleImplementations: 'goto',
      multipleReferences: 'goto',
    },
    /** 禁用悬停提示功能 */
    hover: { enabled: false },
    // 禁用链接功能 - 会禁用 Command/Ctrl + 点击
    links: false,
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

export function editorShowRange(
  editor: editor.IStandaloneCodeEditor,
  monaco: Monaco,
  ranges?: SDK.SourceRange[],
) {
  if (!ranges || ranges.length === 0) return;

  const decorations = ranges.map((range) => ({
    range: getSelectionRange(range, monaco.Range),
    options: {
      inlineClassName: 'file-inline-decoration',
    },
  }));
  editor.deltaDecorations([], decorations);

  setTimeout(() => {
    editor.revealLine(decorations[0].range.startLineNumber);
  });
}
