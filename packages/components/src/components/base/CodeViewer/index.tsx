import { Editor } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { CodeViewerProps } from './interface';
import { defineMonacoOptions, getFileName, getFilePathFormat } from './utils';

import styles from './index.module.scss';

export function CodeViewer({
  code = '',
  lang,
  filePath = '',
  headerVisible = true,
  isLightTheme = false,
}: CodeViewerProps) {
  const editor = useRef<editor.IStandaloneCodeEditor>();
  const language = useMemo(
    () => lang || getFilePathFormat(filePath) || 'plaintext',
    [lang, filePath],
  );
  const options = useMemo(() => defineMonacoOptions(), []);
  const onEditorMount = useCallback(
    (editorInstance: editor.IStandaloneCodeEditor) => {
      editor.current = editorInstance;
    },
    [],
  );
  const theme = isLightTheme ? 'vs-light' : 'vs-dark';

  useEffect(
    () => () => {
      editor.current?.setModel(null);
    },
    [],
  );

  return (
    <div className={styles['code-viewer'] + ' monaco-component'}>
      {headerVisible && Boolean(filePath) && (
        <div className={styles['header']}>
          <div>{getFileName(filePath)}</div>
          <div style={{ flex: 1 }} />
          <div>换行</div>
        </div>
      )}
      <Editor
        theme={theme}
        language={language}
        value={code}
        options={options}
        onMount={onEditorMount}
      />
    </div>
  );
}
