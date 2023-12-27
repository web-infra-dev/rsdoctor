import React from 'react';
import { Space, theme } from 'antd';
import { FileOutlined, FolderOpenOutlined, FolderOutlined, RightOutlined } from '@ant-design/icons';
import Tree, { TreeProps } from 'rc-tree';
import { Size } from '../../constants';

import './index.sass';
import { useTheme } from '../../utils';

const { useToken } = theme;

export const FileTree: React.FC<Partial<TreeProps>> = (props) => {
  const { isDark } = useTheme();

  const { token } = useToken();
  const color = isDark ? token.colorWhite : token.colorPrimaryText;
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
              {expanded ? (
                <FolderOpenOutlined twoToneColor={color} style={style} />
              ) : (
                <FolderOutlined twoToneColor={color} style={style} />
              )}
            </Space>
          );
        }
        return <FileOutlined style={{ marginLeft: Size.BasePadding - 6, color }} />;
      }}
      expandAction="click"
      {...props}
    />
  );
};
