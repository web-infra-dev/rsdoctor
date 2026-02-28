import { Lodash } from '@rsdoctor/utils/common';
import React from 'react';
import VSCodeIcon from '../../common/svg/vscode.svg';

interface VSCodeProps {
  file: string;
  line?: number | string;
  column?: number | string;
  windowId?: number;
  style?: React.CSSProperties;
}

const OPEN_IN_EDITOR_PATH = '/__open-in-editor';

type EditorKind = 'code' | 'cursor' | 'trae';

async function openInEditor(
  file: string,
  line: number | string,
  column: number | string,
  editor: EditorKind,
  urlSchemeFallback: () => void,
) {
  const fileSpec = `${file}:${line}:${column}`;
  try {
    const base =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : '';
    const url = `${base}${OPEN_IN_EDITOR_PATH}?file=${encodeURIComponent(fileSpec)}&editor=${editor}`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      urlSchemeFallback();
    }
  } catch {
    urlSchemeFallback();
  }
}

export function openVSCode({
  file,
  line = 1,
  column = 1,
  windowId,
}: VSCodeProps) {
  const query: Record<string, unknown> = { windowId };
  const queryString = Object.keys(query)
    .map((k) => {
      const v = query[k];
      if (Lodash.isNil(v) || v === '') return null;
      return `${k}=${v}`;
    })
    .filter(Boolean)
    .join('&');

  const fallback = () => {
    let url = `vscode://file/${file}:${line}:${column}`;
    if (queryString) url += `?${queryString}`;
    window.open(url);
  };

  openInEditor(file, line, column, 'code', fallback);
}

export function openCursor({
  file,
  line = 1,
  column = 1,
}: Pick<VSCodeProps, 'file' | 'line' | 'column'>) {
  const fallback = () => {
    window.open(`cursor://file/${file}:${line}:${column}`);
  };
  openInEditor(file, line, column, 'cursor', fallback);
}

export function openTrae({
  file,
  line = 1,
  column = 1,
}: Pick<VSCodeProps, 'file' | 'line' | 'column'>) {
  const fallback = () => {
    window.open(`trae://file/${file}:${line}:${column}`);
  };

  openInEditor(file, line, column, 'trae', fallback);
}

export const VSCode = (props: VSCodeProps): JSX.Element => {
  return (
    <VSCodeIcon
      onClick={() => {
        openVSCode(props);
      }}
      style={{
        width: 14,
        cursor: 'pointer',
        verticalAlign: 'middle',
        display: 'inline',
        transform: 'translateY(-1.5px)',
        ...props.style,
      }}
    />
  );
};
