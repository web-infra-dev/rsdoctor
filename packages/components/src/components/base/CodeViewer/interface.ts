export interface CodeViewerProps {
  /**
   * 亮/暗主题配置, 默认 false
   */
  isLightTheme?: boolean;
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
   * 顶栏是否展示
   * @default true
   */
  headerVisible?: boolean;
}
