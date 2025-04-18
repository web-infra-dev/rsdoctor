import { DiffEditor, MonacoDiffEditor } from '@monaco-editor/react';
import { useCallback, useMemo, useRef } from 'react';
import { getFilePathFormat } from '../CodeViewer/utils';
import { DiffViewerProps } from './interface';
import { defineMonacoDiffOptions } from './utils';

import styles from './index.module.scss';

export function DiffViewer({
  original = '',
  modified = '',
  originalFilePath = '',
  modifiedFilePath = '',
  originalLang,
  modifiedLang,
  isLightTheme = false,
  isSideBySide = true,
}: DiffViewerProps) {
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

  return (
    <div className={styles['diff-viewer']}>
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
  );
}
