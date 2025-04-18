import { MenuFoldOutlined } from '@ant-design/icons';
import { Editor, Monaco, OnMount } from '@monaco-editor/react';
import clsx from 'clsx';
import { isNumber } from 'lodash-es';
import { editor } from 'monaco-editor';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { CodeViewerProps } from './interface';
import {
  defineMonacoOptions,
  editorShowRange,
  getFileName,
  getFilePathFormat,
} from './utils';

import styles from './index.module.scss';

export function CodeViewer({
  className,
  style,
  code = '',
  lang,
  filePath = '',
  defaultLine,
  ranges,
  headerVisible = true,
  isLightTheme = false,
}: CodeViewerProps) {
  const editor = useRef<editor.IStandaloneCodeEditor>();
  const monaco = useRef<Monaco>();
  const language = useMemo(
    () => lang || getFilePathFormat(filePath) || 'plaintext',
    [lang, filePath],
  );
  const options = useMemo(() => defineMonacoOptions(), []);
  const onEditorMount = useCallback<OnMount>((editorInstance, monacoVal) => {
    editor.current = editorInstance;
    monaco.current = monacoVal;

    editorShowRange(editorInstance, monacoVal, ranges);
    if (isNumber(defaultLine)) {
      setTimeout(() => {
        editorInstance.revealLine(defaultLine);
      });
    }
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
      className={clsx(styles['code-viewer'], 'monaco-component', className)}
      style={style}
    >
      {headerVisible && Boolean(filePath) && (
        <div className={styles['header']}>
          <div>{getFileName(filePath)}</div>
          <div style={{ flex: 1 }} />
          <div>
            <MenuFoldOutlined />
          </div>
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
