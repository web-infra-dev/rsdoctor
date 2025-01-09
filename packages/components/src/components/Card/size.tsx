import { Empty, Progress, Space, Tree } from 'antd';
import { sumBy } from 'lodash-es';
import React, { useMemo } from 'react';
import { RightOutlined } from '@ant-design/icons';

import { formatSize } from 'src/utils';
import { TextDrawer } from '../TextDrawer';
import { getFiles } from '../Overall';
import { ServerAPIProvider } from '../Manifest';

import { SDK, Client } from '@rsdoctor/types';

import styles from './size.module.scss';

const { DirectoryTree } = Tree;
const height = 100;

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
  type: string;
}
export interface bgColorType {
  bgColor: string;
  tagBgColor: string;
}

export const SizeCard: React.FC<SizeCardProps> = ({
  files,
  total,
  showProgress = false,
  type,
}) => {
  const fileType =
    type.toLocaleLowerCase() as keyof Client.RsdoctorClientAssetsSummary;
  const sum = useMemo(() => {
    return sumBy(files, (e) => e.size);
  }, [files]);

  return (
    <ServerAPIProvider
      api={SDK.ServerAPI.API.GetAssetsSummary}
      body={{ withFileContent: false }}
    >
      {(res) => {
        const type = fileType.includes('image') ? 'imgs' : fileType;
        const { treeData } = getFiles(res[type].total);
        return (
          <Space style={{ height }} align="center">
            <Progress
              type="circle"
              percent={+((sum / total) * 100).toFixed(2)}
              strokeColor={{ '0%': '#108ee9', '100%': '#108ee9' }}
              strokeWidth={12}
              format={(percent) => (
                <div className={styles.percentContainer}>
                  <span style={{ marginTop: '10px' }}>{percent}%</span>
                  <span className={styles.percentDescription}>
                    total {type}
                  </span>
                </div>
              )}
            />
            <div style={{ marginLeft: '10px' }}>
              <div className={styles.dataContainer}>
                <div className={styles.title}>Size</div>
                <div className={styles.description}>{formatSize(sum)}</div>
              </div>
              <TextDrawer
                buttonProps={{
                  size: 'small',
                }}
                buttonStyle={{
                  fontSize: 'inherit',
                }}
                drawerProps={{
                  title: 'Files',
                }}
                text={
                  <Space
                    style={{ textAlign: showProgress ? 'left' : 'center' }}
                    align="end"
                  >
                    <Space direction="vertical">
                      <div className={styles.dataContainer}>
                        <div className={styles.title}>
                          <span style={{ marginRight: '5px' }}>Files</span>
                          <RightOutlined />
                        </div>
                      </div>
                    </Space>
                  </Space>
                }
              >
                {treeData.length ? (
                  <DirectoryTree
                    defaultExpandAll
                    selectable={false}
                    treeData={treeData}
                    rootStyle={{
                      minHeight: '800px',
                      border: '1px solid rgba(235, 237, 241)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      position: 'relative',
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  >
                    <Empty style={{ height: '100%' }} />
                  </div>
                )}
              </TextDrawer>
              <div className={styles.description}>{files.length}</div>
            </div>
          </Space>
        );
      }}
    </ServerAPIProvider>
  );
};
