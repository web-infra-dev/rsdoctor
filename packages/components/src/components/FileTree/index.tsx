import React from 'react';
import { Space, theme } from 'antd';
import {
  FileOutlined,
  FolderOpenTwoTone,
  FolderTwoTone,
  RightOutlined,
} from '@ant-design/icons';
import Tree, { TreeProps } from 'rc-tree';
import CSSIcon from 'src/common/svg/files/css.svg';
import HtmlIcon from 'src/common/svg/files/html.svg';
import IMGIcon from 'src/common/svg/files/image.svg';
import JSIcon from 'src/common/svg/files/js.svg';
import FileIcon from 'src/common/svg/files/unkown-file.svg';

import './index.sass';
import { useTheme } from '../../utils';
import path from 'path';

const { useToken } = theme;

function getFileType(filename: string) {
  const extension = path.extname(filename).slice(1).toLowerCase();

  switch (extension) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'mjs':
    case 'cjs':
    case 'mts':
    case 'cts':
      return <JSIcon />;
    case 'tsx':
      return <FileIcon />;
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
    case '.styl':
    case '.stylus':
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
    case 'ico':
    case 'apng':
    case 'avif':
    case 'tif':
    case 'tiff':
    case 'jfif':
    case 'pjpeg':
    case 'pjp':
      return <IMGIcon />;
    default:
      return <FileIcon />;
  }
}

export function getFileCom(filename: string) {
  const fileIcon = getFileType(filename);
  return <div className="file-icon">{fileIcon}</div>;
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
          return getFileCom(data.key);
        }
        return <FileOutlined />;
      }}
      expandAction="click"
      {...props}
    />
  );
};
