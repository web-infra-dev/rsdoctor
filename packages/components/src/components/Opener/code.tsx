import { PropsWithChildren } from 'react';
import { Typography } from 'antd';
import path from 'path';
import { startsWith } from 'lodash-es';
import { VSCode, openVSCode } from './vscode';
import { getShortPath } from 'src/utils';

interface CodeOpenerProps {
  windowId?: number;
  /**
   * @example /foo/src/pages/home/index.ts + 100 modules
   * @example /foo/src/pages/b/index.ts
   */
  url: string;
  /**
   * @example 1:0-10
   * @example 1:1
   */
  loc?: string;
  cwd: string;
  label?: string;
  disabled?: boolean;
  code?: boolean;
}

function parseUrl(url: string) {
  const strs = url.split(' ');
  let res = '';
  if (strs.length === 1) {
    [res] = strs;
  } else {
    [res] = strs.filter((e) => path.isAbsolute(e) || startsWith(e, './'));
  }

  return res || url;
}

function parseLoc(loc?: string) {
  if (!loc) return { line: 1, column: 1 };

  const [line, col = ''] = loc.split(':');
  const [start = 1, end] = col.split('-');

  return {
    line,
    columnStart: start,
    columnEnd: end || start,
  };
}

const defaultWindowId = +Date.now().toString().slice(-4) + 1000;

export const CodeOpener = ({
  cwd,
  url,
  loc,
  windowId = defaultWindowId,
  label,
  disabled,
  code = false,
}: PropsWithChildren<CodeOpenerProps>): JSX.Element | null => {
  const file = path.resolve(cwd, parseUrl(url));

  const { line, columnStart } = parseLoc(loc);

  return (
    <span style={{ wordBreak: 'break-all' }}>
      <Typography.Text
        copyable={{
          text: file,
        }}
      >
        <Typography.Text
          code={code}
          onClick={() => {
            if (disabled) return;
            openVSCode({ file, line, column: columnStart, windowId });
          }}
          style={{ cursor: disabled ? 'revert' : 'pointer' }}
        >
          {label || getShortPath(url)}
          {loc ? `:${loc}` : ''}
        </Typography.Text>
      </Typography.Text>
      {process.env.NODE_ENV === 'development' ? (
        <VSCode
          file={file}
          line={line}
          column={columnStart}
          windowId={windowId}
          style={{ marginLeft: 3 }}
        />
      ) : (
        <div style={{ display: 'inline-block' }} />
      )}
      {/* TODO implement open cloud ide or codebase by git url + branch + relative filepath in production */}
    </span>
  );
};
