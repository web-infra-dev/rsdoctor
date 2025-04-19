import { Editor, Monaco, OnMount } from '@monaco-editor/react';
import clsx from 'clsx';
import { isNumber } from 'lodash-es';
import { editor } from 'monaco-editor';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CodeViewerProps } from './interface';
import {
  defineMonacoOptions,
  editorShowRange,
  getFileName,
  getFilePathFormat,
} from './utils';

import { Checkbox } from 'antd';
import styles from './index.module.scss';

export function CodeViewer({
  className,
  style,
  code = '',
  lang,
  filePath = '',
  defaultLine,
  ranges,
  isEmbed = false,
  headerVisible = true,
  isLightTheme = true,
}: CodeViewerProps) {
  const editor = useRef<editor.IStandaloneCodeEditor>();
  const monaco = useRef<Monaco>();
  const language = useMemo(
    () => lang || getFilePathFormat(filePath) || 'plaintext',
    [lang, filePath],
  );
  const [isWordWrap, setIsWordWrap] = useState(true);
  const options = useMemo(
    () => defineMonacoOptions({ wordWrap: isWordWrap ? 'on' : 'off' }),
    [isWordWrap],
  );
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
      className={clsx(
        'monaco-component',
        'code-viewer',
        styles['code-viewer'],
        isEmbed && styles['embed'],
        className,
      )}
      style={style}
    >
      {headerVisible && Boolean(filePath) && (
        <div className={styles['header']}>
          <div>{getFileName(filePath)}</div>
          <div style={{ flex: 1 }} />
          <div>
            <Checkbox
              className={styles['text']}
              title="side-by-side"
              checked={isWordWrap}
              onChange={(evt) => {
                setIsWordWrap(evt.target.checked);
              }}
            >
              word-wrap
            </Checkbox>
          </div>
        </div>
      )}
      <div className={clsx(styles['content'], 'editor-wrap')}>
        <Editor
          theme={theme}
          language={language}
          value={code}
          options={options}
          onMount={onEditorMount}
        />
      </div>
    </div>
  );
}
