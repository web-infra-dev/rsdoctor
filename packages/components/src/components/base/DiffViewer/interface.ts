import { CSSProperties } from 'react';

export interface DiffViewerProps {
  className?: string;
  style?: CSSProperties;
  /**
   * Original file, displayed on the left
   */
  original: string;
  /**
   * Modified file, displayed on the right
   */
  modified: string;
  /**
   * Original file language, highest priority.
   * If not configured, it will be inferred from filePath
   */
  originalLang?: string;
  /**
   * Modified file language, highest priority.
   * If not configured, it will be inferred from filePath
   */
  modifiedLang?: string;
  /**
   * Original file path
   */
  originalFilePath?: string;
  /**
   * Modified file path
   */
  modifiedFilePath?: string;
  /**
   * Whether to display in embedded mode.
   * Embedded mode has no border or border-radius
   * @default false
   */
  isEmbed?: boolean;
  /**
   * Whether to use light theme
   * @default true
   */
  isLightTheme?: boolean;
  /**
   * Whether the top bar is displayed
   * @default true
   */
  headerVisible?: boolean;
}
