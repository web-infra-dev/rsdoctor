/* eslint-disable financial/no-float-calculation */
import React, { useRef } from 'react';
import { Space, Card, Tooltip } from 'antd';
import { SDK } from '@rsdoctor/types';
import { InfoCircleOutlined } from '@ant-design/icons';
import Editor, { OnMount } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { getOriginalLanguage, beautifyModulePath, getSelectionRange, getRevealPositionForViewer } from '../../utils';
import { CodeOpener } from '../Opener';

interface FileHightLightViewerProps {
  cwd: string;
  module: SDK.ModuleData;
  dependency: SDK.DependencyData;
  moduleCode: SDK.ModuleSource;
}

export const FileHightLightViewer: React.FC<FileHightLightViewerProps> = ({ dependency, module, cwd, moduleCode }) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor>(null);

  if (!dependency) return null;

  const { statements } = dependency;
  const hasSourceRange = Boolean(statements?.[0]?.position?.source);
  const { start, end } = statements?.[0]?.position ? hasSourceRange ? statements[0].position.source! : statements[0].position.transformed : { start: { line: 0, column: 0  }, end: { line: 0, column: 0  } } ;
  const content = hasSourceRange ? moduleCode?.source : moduleCode?.transformed;
  const modulePath = module.path;

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    // here is the editor instance
    // you can store it in `useRef` for further usage
    // @ts-ignore
    editorRef.current = editor;
    const range = getSelectionRange({ start, end }, monaco.Range);
    const position = getRevealPositionForViewer(range.startLineNumber, range.startColumn);
    editor.revealPositionInCenter(position);
    editor.deltaDecorations(
      [],
      [
        {
          range,
          options: {
            inlineClassName: 'file-inline-decoration',
          },
        },
      ],
    );
  };

  return (
    <Card
      title={
        <Space>
          <Tooltip title={modulePath} zIndex={99999}>
            <InfoCircleOutlined />
          </Tooltip>
          <CodeOpener
            cwd={cwd}
            url={modulePath}
            label={beautifyModulePath(modulePath, cwd).alias}
            loc={`${start.line}:${start.column || 1}`}
            code
            disabled
          />
        </Space>
      }
      style={{ height: '100%' }}
    >
      <Editor
        theme="vs-dark"
        language={getOriginalLanguage(modulePath)}
        value={content}
        width={'100%'}
        height={window.innerHeight / 1.5}
        options={{
          readOnly: true,
          domReadOnly: true,
          fontSize: 14,
          minimap: {
            enabled: false,
          },
        }}
        onMount={handleEditorDidMount}
      />
    </Card>
  );
};
