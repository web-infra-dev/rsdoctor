import React, { useState } from 'react';
import {
  Descriptions,
  DescriptionsProps,
  Button,
  Tree,
  Tag,
  Segmented,
} from 'antd';
import { FolderOpenTwoTone, RightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import { getFileCom } from '../FileTree';
import { formatSize, useI18n } from '../../utils';
import { TextDrawer } from '../TextDrawer';
import { Card } from '../Card';
import { ServerAPIProvider } from '../Manifest';
import listStyles from './list.module.scss';
import cardStyles from './card.module.scss';
import { DataSummary } from './DataSummary';

import { Client, SDK } from '@rsdoctor/types';
import type { TreeDataNode } from 'antd';

import styles from './bundle.module.scss';

type viewType = 'files' | 'size';

const { DirectoryTree } = Tree;

export const getFiles = (
  data: Client.RsdoctorClientAssetsSummary['all']['total'],
) => {
  let files: Array<{
    fileName: string;
    defaultDir: string;
    size: number;
    initial: boolean;
  }> = [];
  if (data.files.length) {
    files = data.files.map((fileMessage) => {
      const filePath = fileMessage.path;
      const pathArray = filePath.split('/');
      const fileName = pathArray.pop()!;
      const defaultDir = pathArray.join('/') || 'output';

      return {
        fileName,
        defaultDir,
        size: fileMessage.size,
        initial: fileMessage.initial,
      };
    });
  }

  const treeData: TreeDataNode[] = [];
  files.forEach((file) => {
    const target = treeData.find((data) => data.title === file.defaultDir);
    const parent: TreeDataNode = target || {
      title: file.defaultDir,
      key: file.defaultDir,
      icon: <FolderOpenTwoTone />,
      children: [],
    };
    const icon = getFileCom(file.fileName);
    if (!target) {
      treeData.push(parent);
    }
    parent.children!.push({
      title: (
        <div className={styles.treeContainer}>
          <div className={styles.treeTitle}>{file.fileName}</div>
          <div className={styles.line} />
          <Tag className={styles.tag} color="green">
            {formatSize(file.size)}
          </Tag>
          {file.initial ? (
            <Tag className={styles.tag} color="cyan">
              initial
            </Tag>
          ) : null}
        </div>
      ),
      key: file.fileName,
      isLeaf: true,
      icon,
    });
  });

  return {
    treeData,
  };
};

export const getFilesWithDrawer = (
  data: Client.RsdoctorClientAssetsSummary['all']['total'],
): JSX.Element => {
  const { treeData } = getFiles(data);

  return (
    <>
      {data.files.length ? (
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
          text={<span>{data.count}</span>}
        >
          <DirectoryTree
            defaultExpandAll
            selectable={false}
            treeData={treeData}
            rootStyle={{
              minHeight: '800px',
              border: '1px solid rgba(235, 237, 241)',
            }}
          />
        </TextDrawer>
      ) : (
        data.count
      )}
    </>
  );
};

const BundleDescriptions = ({
  res,
  view,
}: {
  res: Client.RsdoctorClientAssetsSummary;
  view: viewType;
}) => {
  const fileItems: DescriptionsProps['items'] = [
    {
      key: 'js-files-count',
      label: 'JS files',
      children: (
        <span className={`${styles.description} ${styles.column}`}>
          {getFilesWithDrawer(res.js.total)}
        </span>
      ),
    },
    {
      key: 'css-files-count',
      label: 'CSS files',
      children: (
        <span className={`${styles.description} ${styles.column}`}>
          {getFilesWithDrawer(res.css.total)}
        </span>
      ),
    },
    {
      key: 'font-files-count',
      label: 'Font files',
      children: (
        <span className={`${styles.description} ${styles.column}`}>
          {getFilesWithDrawer(res.fonts.total)}
        </span>
      ),
    },
    {
      key: 'html-files-count',
      label: 'HTML files',
      children: (
        <span className={styles.description}>
          {getFilesWithDrawer(res.html.total)}
        </span>
      ),
    },
    {
      key: 'image-files-count',
      label: 'Image files',
      children: (
        <span className={styles.description}>
          {getFilesWithDrawer(res.imgs.total)}
        </span>
      ),
    },
    {
      key: 'media-files-count',
      label: 'Media files',
      children: (
        <span className={styles.description}>
          {getFilesWithDrawer(res.media.total)}
        </span>
      ),
    },
  ];

  const [jsSize, jsSizeUnit] = formatSize(res.js.total.size).split(' ');
  const [cssSize, cssSizeUnit] = formatSize(res.css.total.size).split(' ');
  const [fontSize, fontSizeUnit] = formatSize(res.fonts.total.size).split(' ');
  const [htmlSize, htmlSizeUnit] = formatSize(res.html.total.size).split(' ');
  const [imgSize, imgSizeUnit] = formatSize(res.imgs.total.size).split(' ');
  const [mediaSize, mediaSizeUnit] = formatSize(res.media.total.size).split(
    ' ',
  );

  const sizeItems: DescriptionsProps['items'] = [
    {
      key: 'js-files-size',
      label: <span className={styles.label}>JS size</span>,
      children: (
        <div className={styles.column}>
          <span className={styles.description}>{jsSize}</span>
          <span className={styles.unit}>{jsSizeUnit}</span>
        </div>
      ),
    },
    {
      key: 'css-files-size',
      label: <span className={styles.label}>CSS size</span>,
      children: (
        <div className={styles.column}>
          <span className={styles.description}>{cssSize}</span>
          <span className={styles.unit}>{cssSizeUnit}</span>
        </div>
      ),
    },
    {
      key: 'font-files-size',
      label: <span className={styles.label}>Font size</span>,
      children: (
        <div className={styles.column}>
          <span className={styles.description}>{fontSize}</span>
          <span className={styles.unit}>{fontSizeUnit}</span>
        </div>
      ),
    },
    {
      key: 'html-files-size',
      label: <span className={styles.label}>HTML size</span>,
      children: (
        <>
          <span className={styles.description}>{htmlSize}</span>
          <span className={styles.unit}>{htmlSizeUnit}</span>
        </>
      ),
    },
    {
      key: 'image-files-size',
      label: <span className={styles.label}>Image size</span>,
      children: (
        <>
          <span className={styles.description}>{imgSize}</span>
          <span className={styles.unit}>{imgSizeUnit}</span>
        </>
      ),
    },
    {
      key: 'media-files-size',
      label: <span className={styles.label}>Media size</span>,
      children: (
        <>
          <span className={styles.description}>{mediaSize}</span>
          <span className={styles.unit}>{mediaSizeUnit}</span>
        </>
      ),
    },
  ];

  return (
    <Descriptions
      layout={'vertical'}
      className={listStyles.bundleOverall}
      size="small"
      column={3}
      colon={false}
      items={view === 'files' ? fileItems : sizeItems}
    />
  );
};

export const BundleOverall: React.FC<{
  errors: SDK.ErrorsData;
  cwd: string;
}> = (): JSX.Element | null => {
  const [view, setView] = useState<viewType>('size');
  const navigate = useNavigate();
  const { t } = useI18n();

  const handleViewChange = (value: viewType) => {
    setView(value);
  };

  return (
    <ServerAPIProvider
      api={SDK.ServerAPI.API.GetAssetsSummary}
      body={{ withFileContent: false }}
    >
      {(res) => {
        const totalSizeStr = formatSize(res.all.total.size);
        return (
          <Card className={cardStyles.card} style={{ height: '316px' }}>
            <div>
              <div className={styles.title}>
                <span>{t('Bundle Overall')}</span>
                <Button
                  type="link"
                  style={{ padding: '0px' }}
                  onClick={() => {
                    navigate(Client.RsdoctorClientRoutes.BundleSize);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: '8px', fontSize: '13px' }}>
                      View Bundler Size
                    </span>
                    <RightOutlined style={{ fontSize: '10px' }} />
                  </div>
                </Button>
              </div>
              <Segmented
                options={['Size', 'Files']}
                onChange={(val) =>
                  handleViewChange(val.toLocaleLowerCase() as viewType)
                }
                size="small"
                style={{ marginBottom: 8, fontSize: '14px' }}
              />
              <DataSummary
                theme={view === 'files' ? 'common' : 'warning'}
                number={view === 'files' ? res.all.total.count : totalSizeStr}
                description={`Total ${view}`}
              />
              <BundleDescriptions view={view} res={res} />
            </div>
          </Card>
        );
      }}
    </ServerAPIProvider>
  );
};
