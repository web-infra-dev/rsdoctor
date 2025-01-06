/* eslint-disable financial/no-float-calculation */
import React from 'react';
import { SDK } from '@rsdoctor/types';
import Editor, { OnMount } from '@monaco-editor/react';
import { isNumber } from 'lodash-es';
// import { CodeOutlined } from '@ant-design/icons';
import type { editor } from 'monaco-editor';
import { getOriginalLanguage, getSelectionRange } from '../../utils';
import { DefaultEditorConfig } from './config';
import { TextDrawer } from '../TextDrawer';
import { Empty } from 'antd';

interface CodeViewerProps {
  path: string;
  content: string;
  defaultLine?: number;
  ranges?: SDK.SourceRange[];
  editorConfig?: editor.IStandaloneEditorConstructionOptions;
  emptyReason?: string;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  content,
  ranges,
  path,
  defaultLine,
  editorConfig = {},
  emptyReason,
}) => {
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    if (isNumber(defaultLine)) {
      editor.revealLine(defaultLine);
    }

    if (ranges && ranges.length > 0) {
      editor.deltaDecorations(
        [],
        ranges.map((range) => ({
          range: getSelectionRange(range, monaco.Range),
          options: {
            inlineClassName: 'file-inline-decoration',
          },
        })),
      );
    }
  };

  return content ? (
    <Editor
      theme="vs-dark"
      language={getOriginalLanguage(path)}
      value={content}
      width={'100%'}
      height={window.innerHeight / 1.5}
      options={{ ...DefaultEditorConfig, ...editorConfig }}
      onMount={handleEditorDidMount}
    />
  ) : (
    <Empty description={emptyReason} />
  );
};

export const CodeViewerWithDrawer: React.FC<CodeViewerProps> = (props) => {
  return (
    <TextDrawer
      text=""
      drawerProps={{
        destroyOnClose: true,
        title: `Code of "${props.path}"`,
      }}
    >
      <CodeViewer {...props} />
    </TextDrawer>
  );
};
