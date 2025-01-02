import React from 'react';
import { DiffEditor, DiffEditorProps } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { Size } from '../../constants';
import { getModifiedLanguage, getOriginalLanguage } from '../../utils';

interface DiffViewerProps {
  before: string;
  after: string;
  filepath: string;
  className?: string;
  editorProps?: DiffEditorProps;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  before,
  after,
  filepath,
  className,
  editorProps,
}) => {
  return (
    <DiffEditor
      className={className}
      originalLanguage={getOriginalLanguage(filepath)}
      modifiedLanguage={getModifiedLanguage(filepath)}
      theme="vs-light"
      original={before}
      modified={after}
      width="100%"
      {...editorProps}
      options={
        {
          readOnly: true,
          originalEditable: false,
          renderSideBySide: true,
          renderIndicators: true,
          lineDecorationsWidth: Size.BasePadding,
          definitionLinkOpensInPeek: false,
          domReadOnly: true,
          fontSize: 14,
          minimap: { enabled: false },
          diffWordWrap: 'on',
          ...editorProps?.options,
        } as editor.IDiffEditorConstructionOptions
      }
    />
  );
};
