import React from 'react';
import { Space } from 'antd';
import { FileOutlined, FolderOpenOutlined, FolderOutlined, RightOutlined } from '@ant-design/icons';
import Tree, { TreeProps } from 'rc-tree';
import { Size } from '../../constants';

import './index.sass';
import { useTheme } from '../../utils';

export const FileTree: React.FC<Partial<TreeProps>> = (props) => {
  const { isDark } = useTheme();
  const color = isDark ? '#fff' : '#000';
  return (
    <Tree
      checkable={false}
      selectable={true}
      switcherIcon={({ data, expanded }) => {
        if (data?.children) {
          return (
            <Space style={{ color }}>
              <RightOutlined
                className={`file-tree-switcher-arrow ${expanded ? 'file-tree-switcher-arrow-expand' : ''}`}
                style={{ fontSize: 10, color }}
              />
              {expanded ? (
                <FolderOpenOutlined style={{ fontSize: 14, color }} />
              ) : (
                <FolderOutlined style={{ fontSize: 14, color }} />
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
