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

export function openVSCode({
  file,
  line = 1,
  column = 1,
  windowId,
}: VSCodeProps) {
  const query: Record<string, unknown> = {
    windowId,
  };
  const queryString = Object.keys(query)
    .map((k) => {
      const v = query[k];
      if (Lodash.isNil(v) || v === '') {
        return null;
      }
      return `${k}=${v}`;
    })
    .filter(Boolean)
    .join('&');

  let url = `vscode://file/${file}:${line}:${column}`;
  if (queryString) {
    url += `?${queryString}`;
  }
  window.open(url);
}

export function openCursor({
  file,
  line = 1,
  column = 1,
}: Pick<VSCodeProps, 'file' | 'line' | 'column'>) {
  const url = `cursor://file/${file}:${line}:${column}`;
  window.open(url);
}

export function openTrae({
  file,
  line = 1,
  column = 1,
}: Pick<VSCodeProps, 'file' | 'line' | 'column'>) {
  const url = `trae://file/${file}:${line}:${column}`;
  window.open(url);
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
