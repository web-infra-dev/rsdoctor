export interface DiffViewerProps {
  /**
   * 亮/暗主题配置, 默认 false
   */
  isLightTheme?: boolean;
  original: string;
  modified: string;
  originalLang?: string;
  modifiedLang?: string;
  originalFilePath?: string;
  modifiedFilePath?: string;
  /**
   * 是否使用双排展示
   *
   * @default true
   */
  isSideBySide?: boolean;
}
