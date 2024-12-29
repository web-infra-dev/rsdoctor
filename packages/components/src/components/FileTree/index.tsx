import React from 'react';
import { Space, theme } from 'antd';
import {
  FileOutlined,
  FolderOpenTwoTone,
  FolderTwoTone,
  RightOutlined,
} from '@ant-design/icons';
import Tree, { TreeProps } from 'rc-tree';
import CSSIcon from './css.svg';
import HtmlIcon from './html.svg';
import IMGIcon from './image.svg';
import JSIcon from './js.svg';
import FileIcon from './unkown-file.svg';

import './index.sass';
import { useTheme } from '../../utils';
import path from 'path';

const { useToken } = theme;

export function getFileType(filename: string) {
  const extension = path.extname(filename).slice(1).toLowerCase();

  switch (extension) {
    case 'js':
    case 'jsx':
    case 'ts':
      return <JSIcon />;
    case 'tsx':
      return <FileIcon />;
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return <CSSIcon />;
    case 'html':
      return <HtmlIcon />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'bmp':
    case 'webp':
      return <IMGIcon />;
    default:
      return <FileIcon />;
  }
}

export const FileTree: React.FC<Partial<TreeProps>> = (props) => {
  const { isDark } = useTheme();

  const { token } = useToken();
  const color = isDark ? token.colorWhite : token.colorText;
  const style = { fontSize: token.fontSize };

  return (
    <Tree
      checkable={false}
      selectable={true}
      switcherIcon={({ data, expanded }) => {
        if (data?.children) {
          return (
            <Space style={{ color }}>
              <RightOutlined
                twoToneColor={color}
                className={`file-tree-switcher-arrow ${expanded ? 'file-tree-switcher-arrow-expand' : ''}`}
                style={style}
              />
              {expanded ? <FolderOpenTwoTone /> : <FolderTwoTone />}
            </Space>
          );
        }
        if (data?.key && typeof data.key === 'string') {
          return getFileType(data.key);
        }
        return <FileOutlined />;
      }}
      expandAction="click"
      {...props}
    />
  );
};
