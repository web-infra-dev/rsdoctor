import {
  DiffEditor,
  DiffOnMount,
  MonacoDiffEditor,
} from '@monaco-editor/react';
import { Checkbox } from 'antd';
import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getFileName, getFilePathFormat } from '../CodeViewer/utils';
import { beautifyJavaScript } from './beautify';
import styles from './index.module.scss';
import { DiffViewerProps } from './interface';
import { defineMonacoDiffOptions } from './utils';
import { useTheme } from '../../../utils';

export function DiffViewer({
  className,
  style,
  original = '',
  modified = '',
  originalFilePath = '',
  modifiedFilePath = '',
  originalLang,
  modifiedLang,
  isEmbed = false,
  isLightTheme: isLightThemeProp,
  headerVisible = true,
}: DiffViewerProps) {
  const { isLight: isLightMode } = useTheme();
  const isLightTheme: boolean = isLightThemeProp ?? isLightMode;
  const [isSideBySide, setIsSideBySide] = useState(true);
  const [isBeautified, setIsBeautified] = useState(false);
  const editor = useRef<MonacoDiffEditor>(undefined);
  const originalLanguage = useMemo(
    () => originalLang || getFilePathFormat(originalFilePath) || 'plaintext',
    [originalLang, originalFilePath],
  );
  const modifiedLanguage = useMemo(
    () => modifiedLang || getFilePathFormat(modifiedFilePath) || 'plaintext',
    [modifiedLang, modifiedFilePath],
  );
  const options = useMemo(
    () => defineMonacoDiffOptions({ renderSideBySide: isSideBySide }),
    [isSideBySide],
  );
  const theme = isLightTheme ? 'vs-light' : 'vs-dark';
  const supportsBeautify =
    originalLanguage === 'javascript' && modifiedLanguage === 'javascript';
  const beautifiedCode = useMemo(
    () =>
      isBeautified && supportsBeautify
        ? {
            original: beautifyJavaScript(original),
            modified: beautifyJavaScript(modified),
          }
        : undefined,
    [isBeautified, modified, original, supportsBeautify],
  );

  const onEditorMount = useCallback<DiffOnMount>((editorInstance) => {
    editor.current = editorInstance;
  }, []);

  useEffect(
    () => () => {
      editor.current?.setModel(null);
    },
    [],
  );

  return (
    <div
      className={clsx(
        'monaco-component',
        'diff-viewer',
        styles['diff-viewer'],
        isEmbed && styles['embed'],
        className,
      )}
      style={style}
    >
      {headerVisible && (
        <div className={styles['header']}>
          <div>{getFileName(originalFilePath)}</div>
          <div style={{ flex: 1 }} />
          <div>
            <Checkbox
              className={styles['text']}
              title="side-by-side"
              checked={isSideBySide}
              onChange={(evt) => {
                setIsSideBySide(evt.target.checked);
              }}
            >
              side-by-side
            </Checkbox>
            <Checkbox
              className={styles['text']}
              checked={isBeautified}
              disabled={!supportsBeautify}
              onChange={(evt) => {
                setIsBeautified(evt.target.checked);
              }}
            >
              beautify JS
            </Checkbox>
          </div>
        </div>
      )}
      <div className={clsx(styles['content'], 'editor-wrap')}>
        <DiffEditor
          theme={theme}
          originalLanguage={originalLanguage}
          modifiedLanguage={modifiedLanguage}
          originalModelPath={
            originalFilePath ? `diff://original/${originalFilePath}` : undefined
          }
          original={beautifiedCode?.original ?? original}
          modifiedModelPath={
            modifiedFilePath ? `diff://modified/${modifiedFilePath}` : undefined
          }
          modified={beautifiedCode?.modified ?? modified}
          width="100%"
          options={options}
          onMount={onEditorMount}
        />
      </div>
    </div>
  );
}

export type { DiffViewerProps } from './interface';
export { useDiffDrawer } from './useDiffDrawer';
export { defineMonacoDiffOptions } from './utils';
