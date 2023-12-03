/* eslint-disable financial/no-float-calculation */
import React from 'react';
import { SDK } from '@rsdoctor/types';
import Editor, { OnMount } from '@monaco-editor/react';
import { isNumber } from 'lodash-es';
import { CodepenOutlined } from '@ant-design/icons';
import type { editor } from 'monaco-editor';
import { getOriginalLanguage, getSelectionRange } from '../../utils';
import { DefaultEditorConfig } from './config';
import { TextDrawer } from '../TextDrawer';

interface CodeViewerProps {
  path: string;
  content: string;
  defaultLine?: number;
  ranges?: SDK.SourceRange[];
  editorConfig?: editor.IStandaloneEditorConstructionOptions;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ content, ranges, path, defaultLine, editorConfig = {} }) => {
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

  return (
    <Editor
      theme="vs-dark"
      language={getOriginalLanguage(path)}
      value={content}
      width={'100%'}
      height={window.innerHeight / 1.5}
      options={{ ...DefaultEditorConfig, ...editorConfig }}
      onMount={handleEditorDidMount}
    />
  );
};

export const CodeViewerWithDrawer: React.FC<CodeViewerProps> = (props) => {
  return (
    <TextDrawer
      text=""
      buttonProps={{
        size: 'small',
        icon: <CodepenOutlined />,
        type: 'default',
      }}
      buttonStyle={{ padding: `0 4px` }}
      drawerProps={{
        destroyOnClose: true,
        title: `Code of "${props.path}"`,
      }}
    >
      <CodeViewer {...props} />
    </TextDrawer>
  );
};
