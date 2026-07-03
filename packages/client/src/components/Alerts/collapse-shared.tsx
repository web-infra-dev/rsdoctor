import { Space, Tooltip } from 'antd';
import { ReactNode } from 'react';

import VSCodeIcon from '../../common/svg/vscode.svg';
import CursorIcon from '../../common/svg/cursor.svg';
import TraeIcon from '../../common/svg/trae.svg';
import { openVSCode, openCursor, openTrae } from '../Opener';

import styles from './collapse.module.scss';

export const LabelComponent = (props: {
  title: string | ReactNode;
  description: string;
  extra?: ReactNode;
}) => {
  const { title, description, extra } = props;
  return (
    <div className={styles.label}>
      <div className={styles.labelContent}>
        <div>{title}</div>
        <div>{description}</div>
      </div>
      <div>{extra}</div>
    </div>
  );
};

export const IdeIcons = ({ file }: { file: string }) => (
  <Space size={4} style={{ marginLeft: 8, flexShrink: 0, marginTop: 5 }}>
    <Tooltip title="Open in VSCode">
      <VSCodeIcon
        style={{ width: 16, height: 16, cursor: 'pointer' }}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          openVSCode({ file });
        }}
      />
    </Tooltip>
    <Tooltip title="Open in Cursor">
      <CursorIcon
        style={{ width: 16, height: 16, cursor: 'pointer' }}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          openCursor({ file });
        }}
      />
    </Tooltip>
    <Tooltip title="Open in Trae">
      <TraeIcon
        style={{ width: 16, height: 16, cursor: 'pointer' }}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          openTrae({ file });
        }}
      />
    </Tooltip>
  </Space>
);
