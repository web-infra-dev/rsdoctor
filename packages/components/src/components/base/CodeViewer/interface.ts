import { SDK } from '@rsdoctor/types';
import { CSSProperties } from 'react';

export interface CodeViewerProps {
  className?: string;
  style?: CSSProperties;
  /**
   * Whether to display in embedded mode.
   * Embedded mode has no border or border-radius
   * @default false
   */
  isEmbed?: boolean;
  /**
   * Whether to use light theme configuration
   * @default true
   */
  isLightTheme?: boolean;
  /**
   * Code content
   */
  code?: string;
  /**
   * Specify language format, highest priority. If not specified,
   * it will be inferred from filePath
   */
  lang?: string;
  /**
   * File path
   */
  filePath?: string;
  /**
   * Default line to display in the editor
   */
  defaultLine?: number;
  /**
   * Editor text highlighting configuration. When configured,
   * it will automatically position to the first highlighted location.
   * Positioning priority is lower than defaultLine
   */
  ranges?: SDK.SourceRange[];
  /**
   * Whether the top bar is displayed
   * @default true
   */
  headerVisible?: boolean;
}
