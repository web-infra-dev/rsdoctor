export interface DiffViewerProps {
  original: string;
  modified: string;
  originalLang?: string;
  modifiedLang?: string;
  originalFilePath?: string;
  modifiedFilePath?: string;
  /**
   * 亮/暗主题配置, 默认 false
   */
  isLightTheme?: boolean;
  /**
   * 顶栏是否展示
   * @default true
   */
  headerVisible?: boolean;
}
