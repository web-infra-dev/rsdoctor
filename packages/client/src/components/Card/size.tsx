import { Empty, Progress, Segmented, Tree } from 'antd';
import { sumBy } from '@rsdoctor/shared/collection';
import React, { useEffect, useMemo, useState } from 'react';
import { RightOutlined } from '@ant-design/icons';

import { formatSize, useElementSize } from 'src/utils';
import { TextDrawer } from '../TextDrawer';
import { getFiles } from '../Overall';
import { ServerAPIProvider } from '../Manifest';

import { SDK, Client } from '@rsdoctor/shared/types';

import styles from './size.module.scss';

const { DirectoryTree } = Tree;
type SizeMetric = 'size' | 'gzip' | 'brotli';

export interface SizeCardProps {
  files: {
    path: string;
    size: number;
    gzipSize?: number;
    brotliSize?: number;
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

export const SizeCard: React.FC<SizeCardProps> = ({ files, total, type }) => {
  const [contentRef, { width }] = useElementSize();
  const [sizeMetric, setSizeMetric] = useState<SizeMetric>('size');
  const fileType =
    type.toLocaleLowerCase() as keyof Client.RsdoctorClientAssetsSummary;
  const sum = useMemo(() => {
    return sumBy(files, (e) => e.size);
  }, [files]);
  const gzipSum = useMemo(() => {
    return sumBy(files, (e) => e.gzipSize ?? 0);
  }, [files]);
  const brotliSum = useMemo(
    () => sumBy(files, (file) => file.brotliSize ?? 0),
    [files],
  );
  const hasBrotliSize = files.some((file) => file.brotliSize !== undefined);
  const hasGzipSize = files.some((file) => file.gzipSize !== undefined);

  useEffect(() => {
    if (
      (sizeMetric === 'gzip' && !hasGzipSize) ||
      (sizeMetric === 'brotli' && !hasBrotliSize)
    ) {
      setSizeMetric('size');
    }
  }, [hasGzipSize, hasBrotliSize, sizeMetric, type]);

  return (
    <div ref={contentRef} className={styles.container}>
      <ServerAPIProvider
        api={SDK.ServerAPI.API.GetAssetsSummary}
        body={{ withFileContent: false }}
      >
        {(res) => {
          const type = fileType.includes('image') ? 'imgs' : fileType;
          const { treeData } = getFiles(res[type].total);
          const totalGzipSize = sumBy(
            res.all.total.files,
            (file) => file.gzipSize ?? 0,
          );
          const selectedSize =
            sizeMetric === 'brotli'
              ? brotliSum
              : sizeMetric === 'gzip'
                ? gzipSum
                : sum;
          const selectedTotal =
            sizeMetric === 'brotli'
              ? sumBy(res.all.total.files, (file) => file.brotliSize ?? 0)
              : sizeMetric === 'gzip'
                ? totalGzipSize
                : total;
          const percent = selectedTotal
            ? +((selectedSize / selectedTotal) * 100).toFixed(2)
            : 0;

          return (
            <>
              <Progress
                type="circle"
                size={Math.max(80, Math.min(120, width - 156))}
                percent={percent}
                strokeColor={{ '0%': '#108ee9', '100%': '#108ee9' }}
                strokeWidth={12}
                format={(percent) => (
                  <div className={styles.percentContainer}>
                    <span>{percent}%</span>
                    <span className={styles.percentDescription}>
                      total {type}
                    </span>
                  </div>
                )}
              />
              <div className={styles.details}>
                <Segmented
                  aria-label={`${type} size metric`}
                  className={styles.metricSelector}
                  options={[
                    { label: 'Size', value: 'size' },
                    { label: 'Gzip', value: 'gzip', disabled: !hasGzipSize },
                    {
                      label: 'Brotli',
                      value: 'brotli',
                      disabled: !hasBrotliSize,
                    },
                  ]}
                  value={sizeMetric}
                  size="small"
                  onChange={(value) => setSizeMetric(value as SizeMetric)}
                />
                <div className={`${styles.description} ${styles.metricValue}`}>
                  {formatSize(selectedSize)}
                </div>
                <div className={styles.fileCount}>
                  <TextDrawer
                    buttonProps={{
                      size: 'small',
                      className: styles.filesLink,
                    }}
                    buttonStyle={{
                      fontSize: 'inherit',
                    }}
                    drawerProps={{
                      title: 'Files',
                    }}
                    text={
                      <>
                        <span>Files</span>
                        <RightOutlined />
                      </>
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
                  <span>{files.length}</span>
                </div>
              </div>
            </>
          );
        }}
      </ServerAPIProvider>
    </div>
  );
};
