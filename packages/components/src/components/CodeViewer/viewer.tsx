import Editor, { OnMount } from '@monaco-editor/react';
import { SDK } from '@rsdoctor/types';
import { Empty } from 'antd';
import { Lodash } from '@rsdoctor/utils/common';
import type { editor } from 'monaco-editor';
import React from 'react';
import { getOriginalLanguage, getSelectionRange } from '../../utils';
import { TextDrawer } from '../TextDrawer';
import { DefaultEditorConfig } from './config';

interface CodeViewerProps {
  path: string;
  content: string;
  defaultLine?: number;
  ranges?: SDK.SourceRange[];
  editorConfig?: editor.IStandaloneEditorConstructionOptions;
  emptyReason?: string;
}

/** @deprecated please use CodeViewer in /base/CodeViewer */
export const CodeViewer: React.FC<CodeViewerProps> = ({
  content,
  ranges,
  path,
  defaultLine,
  editorConfig = {},
  emptyReason,
}) => {
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    if (Lodash.isNumber(defaultLine)) {
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

///REVIEW - no use, if can delete
/** @deprecated please use hook useCodeDrawer instead */
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
