import { ExceptionOutlined } from '@ant-design/icons';
import { Empty, Progress, Space, Tag, Tooltip, Typography, theme } from 'antd';
import { sumBy } from 'lodash-es';
import React, { useMemo } from 'react';
import { createFileStructures, formatSize } from 'src/utils';
import { FileTree } from '../FileTree';
import { TextDrawer } from '../TextDrawer';

const height = 100;
const { useToken } = theme;

export interface SizeCardProps {
  files: {
    path: string;
    size: number;
  }[];
  /**
   * total size for origin files
   */
  total: number;
  /**
   * @default false
   */
  showProgress?: boolean;
  tagBgColor: string;
}
export interface bgColorType {
  bgColor: string;
  tagBgColor: string;
}

export const SizeCard: React.FC<SizeCardProps> = ({ files, total, showProgress = false, tagBgColor }) => {
  const { token } = useToken()
  const sum = useMemo(() => {
    return sumBy(files, (e) => e.size);
  }, [files]);

  const fileStructures = useMemo(() => {
    return createFileStructures({
      files: files.map((e) => e.path),
      fileTitle(file, basename) {
        const { size } = files.find((e) => e.path === file)!;
        return (
          <Space>
            <Typography.Text>{basename}</Typography.Text>
            <Tag color="success">{formatSize(size)}</Tag>
          </Space>
        );
      },
    });
  }, [files]);

  if (fileStructures.length === 0) {
    return (
      <Space style={{ height, fontSize: 24 }} align="center">
        <Tag bordered={false} color={tagBgColor}>
          <Typography.Text style={{ fontSize: 14, color: token.colorWhite }}>
              <Typography.Text style={{ color: token.colorWhite  }}> {0}</Typography.Text>
              {` Files`}
          </Typography.Text>
        </Tag>
      </Space>
    );
  }

  return (
    <Space style={{ height }} align="center">
      {showProgress ? (
        sum === 0 ?
        <Empty />
        :
        <Progress
          type="dashboard"
          percent={+((sum / total) * 100).toFixed(2)}
          strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
          width={80}
        />
      ) : null}
      <TextDrawer
        text={
          <Tooltip title="Click to show the total files">
            <Space style={{ textAlign: showProgress ? 'left' : 'center' }} align="end">
              <Space direction="vertical">
                <Tag bordered={false} color={tagBgColor}>
                  <Typography.Text style={{ fontSize: 14, color: token.colorWhite }}>
                      <Typography.Text style={{ color: token.colorWhite  }}> {files.length}</Typography.Text>
                      {` Files`}
                  </Typography.Text>
                </Tag>
                <Typography.Text style={{ fontSize: 20 }}>{formatSize(sum)}</Typography.Text>
              </Space>
              <ExceptionOutlined style={{ transform: 'translateY(-3.5px)' }} />
            </Space>
          </Tooltip>
        }
        buttonStyle={{ height: '100%' }}
        buttonProps={{ type: 'text' }}
      >
        <FileTree
          // autoExpandParent
          treeData={fileStructures}
          defaultExpandAll
          titleRender={(v) => <Typography.Text>{v.title as React.ReactNode}</Typography.Text>}
        />
      </TextDrawer>
    </Space>
  );
};
