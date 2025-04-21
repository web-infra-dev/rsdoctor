import { InfoCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import Editor, { OnMount } from '@monaco-editor/react';
import { SDK } from '@rsdoctor/types';
import { Card, Space, Tooltip, Typography } from 'antd';
import type { editor, Range as RangeClass } from 'monaco-editor';
import path from 'path-browserify';
import { useEffect, useRef, useState } from 'react';
import { defineMonacoOptions } from 'src/components/base/CodeViewer/utils';
import { getOriginalLanguage, getSelectionRange } from '../../utils';
import { parseOpenTag } from './open-tag';
import { Range } from './range';
import { SetEditorStatus } from './types';
import { getHoverMessageInModule } from './utils';

export interface CodeEditorProps {
  module: SDK.ModuleInstance;
  moduleGraph: SDK.ModuleGraphInstance;
  ranges: SDK.SourceRange[];
  setEditorData: SetEditorStatus;
  source: SDK.ModuleSource;
  toLine?: number;
}

const defaultEditOption = defineMonacoOptions();

export function CodeEditor(props: CodeEditorProps) {
  const { module, moduleGraph, ranges, toLine, setEditorData, source } = props;
  const editorRef = useRef<editor.IStandaloneCodeEditor>();
  const oldRanges = useRef<string[]>([]);
  const oldHovers = useRef<string[]>([]);
  const oldToLine = useRef<number>();
  const changeModule = useRef(false);
  const [content, setContent] = useState('');
  // const [isDynamic, setIsDynamic] = useState(false);
  // const [exports, setExports] = useState<SDK.ExportData[]>([]);

  useEffect(() => {
    const { isPreferSource } = module;
    changeModule.current = true;
    setContent(
      source.source || isPreferSource ? source.source : source.transformed,
    );
    setTimeout(() => {
      oldHovers.current =
        editorRef.current
          ?.getModel()
          ?.deltaDecorations(
            oldHovers.current,
            getHoverMessageInModule(module, moduleGraph),
          ) ?? [];
    }, 200);
  }, [module, source]);

  useEffect(() => {
    function setRangeAndLine() {
      const model = editorRef.current?.getModel();

      if (!model) {
        return;
      }

      oldRanges.current = model.deltaDecorations(
        oldRanges.current,
        ranges.map((arr) => {
          return {
            range: getSelectionRange(
              arr,
              Range as unknown as typeof RangeClass,
            ),
            options: {
              stickiness: 1,
              inlineClassName: 'tree-shaking-statement-side-effect',
              isWholeLine: false,
              showIfCollapsed: true,
            },
          } as unknown as editor.IModelDecoration;
        }),
      );

      if (
        editorRef.current &&
        typeof toLine === 'number' &&
        oldToLine.current !== toLine
      ) {
        oldToLine.current = toLine;
        editorRef.current.revealLine(toLine, 0);
      }
    }

    // 模块变更时，高亮和滚动需要等待 300ms，确保在文本变更之后
    if (changeModule) {
      setTimeout(setRangeAndLine, 300);
    } else {
      setRangeAndLine();
    }

    changeModule.current = false;
  }, [ranges, toLine]);

  useEffect(() => {
    const openEditor = (event: MouseEvent) => {
      const query = parseOpenTag(event.target as HTMLElement);

      if (query) {
        const module = moduleGraph.getModuleById(query.module);

        if (module) {
          setEditorData(module, [query.range], query.range.start.line);
        }
      }
    };

    document.body.addEventListener('click', openEditor);

    return () => {
      document.body.removeEventListener('click', openEditor);
    };
  }, []);

  if (!module) {
    return <div>请选择要查看的模块</div>;
  }

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  return (
    <Card
      title={
        <Tooltip title={module.path}>
          <Space>
            <Typography.Text>{path.basename(module.path)}</Typography.Text>
            <InfoCircleOutlined />
          </Space>
        </Tooltip>
      }
      className="tree-shaking-editor"
    >
      {/* TODO: change to CodeViewer */}
      <Editor
        theme="vs-dark"
        language={getOriginalLanguage(module.path)}
        value={content}
        loading={<LoadingOutlined style={{ fontSize: 30 }} />}
        options={defaultEditOption}
        onMount={handleEditorDidMount}
      />
    </Card>
  );
}
