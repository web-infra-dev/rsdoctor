import { LoadingOutlined } from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import { Card } from 'antd';
import { getOriginalLanguage, getShortPath } from '../../../utils';


export interface CodeEditorProps {
  content?: string;
  path: string;
}

export function CodeEditor(props: CodeEditorProps) {
  const { content, path } = props;

  if (!content) {
    return <div>No Code~</div>;
  }

  return (
    <Card title={getShortPath(path)} className="bundle-size-editor" style={{ height: '90%' }}>
      <Editor
        theme="vs-dark"
        language={getOriginalLanguage(path)}
        value={content}
        loading={<LoadingOutlined style={{ fontSize: 30, height: '8em' }} />}
        options={{
          readOnly: true,
          domReadOnly: true,
          fontSize: 12,
          renderValidationDecorations: 'off',
          hideCursorInOverviewRuler: true,
          smoothScrolling: true,
          wordWrap: 'bounded',
          colorDecorators: true,
          codeLens: false,
          cursorWidth: 0,
          minimap: {
            enabled: false,
          },
        }}
      />
    </Card>
  );
}
