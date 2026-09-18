import {
  DiffEditor,
  DiffOnMount,
  Monaco,
  MonacoDiffEditor,
} from '@monaco-editor/react';
import { Checkbox } from 'antd';
import clsx from 'clsx';
import type { editor } from 'monaco-editor';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getFileName, getFilePathFormat } from '../CodeViewer/utils';
import styles from './index.module.scss';
import { DiffViewerProps } from './interface';
import { defineMonacoDiffOptions } from './utils';
import { useTheme } from '../../../utils';

const formattingOptions = {
  convertTabsToSpaces: true,
  indentSize: 2,
  tabSize: 2,
  newLineCharacter: '\n',
  insertSpaceAfterCommaDelimiter: true,
  insertSpaceAfterConstructor: false,
  insertSpaceAfterSemicolonInForStatements: true,
  insertSpaceBeforeAndAfterBinaryOperators: true,
  insertSpaceAfterKeywordsInControlFlowStatements: true,
  insertSpaceAfterFunctionKeywordForAnonymousFunctions: true,
  insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: false,
  insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets: false,
  insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: true,
  insertSpaceAfterOpeningAndBeforeClosingEmptyBraces: false,
  insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces: false,
  insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces: false,
  insertSpaceAfterTypeAssertion: false,
  placeOpenBraceOnNewLineForFunctions: false,
  placeOpenBraceOnNewLineForControlBlocks: false,
  semicolons: 'ignore',
  trimTrailingWhitespace: true,
};

async function formatTypeScriptModel(monaco: Monaco, model: editor.ITextModel) {
  const language = model.getLanguageId();
  const getWorker =
    language === 'javascript'
      ? monaco.languages.typescript.getJavaScriptWorker
      : language === 'typescript'
        ? monaco.languages.typescript.getTypeScriptWorker
        : undefined;

  if (!getWorker) return;

  const version = model.getVersionId();
  const worker = await getWorker();
  const client = await worker(model.uri);
  const edits = await client.getFormattingEditsForDocument(
    model.uri.toString(),
    formattingOptions,
  );

  if (model.isDisposed() || model.getVersionId() !== version) return;

  model.applyEdits(
    edits.map(({ newText, span }) => ({
      range: {
        startLineNumber: model.getPositionAt(span.start).lineNumber,
        startColumn: model.getPositionAt(span.start).column,
        endLineNumber: model.getPositionAt(span.start + span.length).lineNumber,
        endColumn: model.getPositionAt(span.start + span.length).column,
      },
      text: newText,
    })),
  );
}

export function DiffViewer({
  className,
  style,
  original = '',
  modified = '',
  originalFilePath = '',
  modifiedFilePath = '',
  originalLang,
  modifiedLang,
  isEmbed = false,
  isLightTheme: isLightThemeProp,
  headerVisible = true,
}: DiffViewerProps) {
  const { isLight: isLightMode } = useTheme();
  const isLightTheme: boolean = isLightThemeProp ?? isLightMode;
  const [isSideBySide, setIsSideBySide] = useState(true);
  const [isFormatted, setIsFormatted] = useState(false);
  const editor = useRef<MonacoDiffEditor>(undefined);
  const monaco = useRef<Monaco>(undefined);
  const originalLanguage = useMemo(
    () => originalLang || getFilePathFormat(originalFilePath) || 'plaintext',
    [originalLang, originalFilePath],
  );
  const modifiedLanguage = useMemo(
    () => modifiedLang || getFilePathFormat(modifiedFilePath) || 'plaintext',
    [modifiedLang, modifiedFilePath],
  );
  const options = useMemo(
    () => defineMonacoDiffOptions({ renderSideBySide: isSideBySide }),
    [isSideBySide],
  );
  const theme = isLightTheme ? 'vs-light' : 'vs-dark';

  const updateFormatting = useCallback(
    (editorInstance: MonacoDiffEditor, monacoInstance: Monaco) => {
      const originalEditor = editorInstance.getOriginalEditor();
      const modifiedEditor = editorInstance.getModifiedEditor();

      if (!isFormatted) {
        originalEditor.getModel()?.setValue(original);
        modifiedEditor.getModel()?.setValue(modified);
        return;
      }

      void Promise.all([
        formatTypeScriptModel(monacoInstance, originalEditor.getModel()!),
        formatTypeScriptModel(monacoInstance, modifiedEditor.getModel()!),
      ]);
    },
    [isFormatted, modified, original],
  );

  const onEditorMount = useCallback<DiffOnMount>(
    (editorInstance, monacoInstance) => {
      editor.current = editorInstance;
      monaco.current = monacoInstance;
      updateFormatting(editorInstance, monacoInstance);
    },
    [updateFormatting],
  );

  useEffect(() => {
    if (editor.current && monaco.current) {
      updateFormatting(editor.current, monaco.current);
    }
  }, [updateFormatting]);

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
        'diff-viewer',
        styles['diff-viewer'],
        isEmbed && styles['embed'],
        className,
      )}
      style={style}
    >
      {headerVisible && (
        <div className={styles['header']}>
          <div>{getFileName(originalFilePath)}</div>
          <div style={{ flex: 1 }} />
          <div>
            <Checkbox
              className={styles['text']}
              title="side-by-side"
              checked={isSideBySide}
              onChange={(evt) => {
                setIsSideBySide(evt.target.checked);
              }}
            >
              side-by-side
            </Checkbox>
            <Checkbox
              className={styles['text']}
              checked={isFormatted}
              onChange={(evt) => {
                setIsFormatted(evt.target.checked);
              }}
            >
              format
            </Checkbox>
          </div>
        </div>
      )}
      <div className={clsx(styles['content'], 'editor-wrap')}>
        <DiffEditor
          theme={theme}
          originalLanguage={originalLanguage}
          modifiedLanguage={modifiedLanguage}
          originalModelPath={
            originalFilePath ? `diff://original/${originalFilePath}` : undefined
          }
          original={original}
          modifiedModelPath={
            modifiedFilePath ? `diff://modified/${modifiedFilePath}` : undefined
          }
          modified={modified}
          width="100%"
          options={options}
          onMount={onEditorMount}
        />
      </div>
    </div>
  );
}

export type { DiffViewerProps } from './interface';
export { useDiffDrawer } from './useDiffDrawer';
export { defineMonacoDiffOptions } from './utils';
