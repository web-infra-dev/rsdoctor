import { DiffEditor, MonacoDiffEditor } from '@monaco-editor/react';
import { Checkbox } from 'antd';
import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getFileName, getFilePathFormat } from '../CodeViewer/utils';
import styles from './index.module.scss';
import { DiffViewerProps } from './interface';
import { defineMonacoDiffOptions } from './utils';

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
  isLightTheme = true,
  headerVisible = true,
}: DiffViewerProps) {
  const [isSideBySide, setIsSideBySide] = useState(true);
  const editor = useRef<MonacoDiffEditor>();
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
  const onEditorMount = useCallback((editorInstance: MonacoDiffEditor) => {
    editor.current = editorInstance;
  }, []);
  const theme = isLightTheme ? 'vs-light' : 'vs-dark';

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
          </div>
        </div>
      )}
      <div className={clsx(styles['content'], 'editor-wrap')}>
        <DiffEditor
          theme={theme}
          originalLanguage={originalLanguage}
          modifiedLanguage={modifiedLanguage}
          original={original}
          modified={modified}
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
