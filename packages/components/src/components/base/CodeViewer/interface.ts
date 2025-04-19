import { SDK } from '@rsdoctor/types';
import { CSSProperties } from 'react';

export interface CodeViewerProps {
  className?: string;
  style?: CSSProperties;
  /**
   * 是否展示为内嵌模式, 内嵌模式没有边框和 border-radius
   * @default false
   */
  isEmbed?: boolean;
  /**
   * 是否使用亮色主题配置
   * @default true
   */
  isLightTheme?: boolean;
  /**
   * 代码内容
   */
  code?: string;
  /**
   * 指定语言格式, 优先级最高. 如未指定, 会通过 filePath 推断
   */
  lang?: string;
  /**
   * 文件路径
   */
  filePath?: string;
  /**
   * 编辑器默认展示第几行
   */
  defaultLine?: number;
  /**
   * 编辑器高亮文本配置, 配置后会默认定位到第一个高亮位置,
   * 定位优先级低于 defaultLine
   */
  ranges?: SDK.SourceRange[];
  /**
   * 顶栏是否展示
   * @default true
   */
  headerVisible?: boolean;
}
