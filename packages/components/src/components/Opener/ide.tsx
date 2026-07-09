import { Lodash } from '@rsdoctor/utils/common';
import { SDK } from '@rsdoctor/types';
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

let openInEditorTokenTask: Promise<string | undefined> | undefined;

function getOpenInEditorTokenFromSocketUrl(socketUrl?: string) {
  if (!socketUrl) return undefined;
  try {
    return (
      new URL(socketUrl, window.location.origin).searchParams.get('token') ||
      undefined
    );
  } catch {
    return undefined;
  }
}

async function getOpenInEditorToken(base: string) {
  if (!base) return undefined;
  if (!openInEditorTokenTask) {
    openInEditorTokenTask = fetch(`${base}${SDK.ServerAPI.API.Manifest}`)
      .then((res) => (res.ok ? res.json() : undefined))
      .then((manifest) =>
        getOpenInEditorTokenFromSocketUrl(manifest?.__SOCKET__URL__),
      )
      .catch(() => undefined);
  }

  return openInEditorTokenTask;
}

async function openInEditor(
  file: string,
  line: number | string,
  column: number | string,
  editor: SDK.OpenInEditorKind,
  urlSchemeFallback: () => void,
) {
  const fileSpec = `${file}:${line}:${column}`;
  try {
    const base =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : '';
    const token = await getOpenInEditorToken(base);
    if (!token) {
      urlSchemeFallback();
      return;
    }
    const params = new URLSearchParams({
      file: fileSpec,
      editor,
      token,
    });
    const res = await fetch(`${base}${OPEN_IN_EDITOR_PATH}?${params}`, {
      method: 'GET',
    });
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

export const VSCode = (props: VSCodeProps): React.JSX.Element => {
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
