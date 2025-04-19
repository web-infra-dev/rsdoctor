import { CSSProperties } from 'react';

export interface DiffViewerProps {
  className?: string;
  style?: CSSProperties;
  /**
   * 原始文件, 展示在左侧
   */
  original: string;
  /**
   * 更新文件, 展示在右侧
   */
  modified: string;
  /**
   * 原始文件类型, 优先级最高, 如未配置则从 filePath 进行推断
   */
  originalLang?: string;
  /**
   * 更新文件类型, 优先级最高, 如未配置则从 filePath 进行推断
   */
  modifiedLang?: string;
  /**
   * 原始文件地址
   */
  originalFilePath?: string;
  /**
   * 更新文件地址
   */
  modifiedFilePath?: string;
  /**
   * 是否展示为内嵌模式, 内嵌模式没有边框和 border-radius
   * @default false
   */
  isEmbed?: boolean;
  /**
   * 是否使用亮色主题
   * @default true
   */
  isLightTheme?: boolean;
  /**
   * 顶栏是否展示
   * @default true
   */
  headerVisible?: boolean;
}
