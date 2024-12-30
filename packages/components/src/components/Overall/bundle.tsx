import React, { useState } from 'react';
import {
  Descriptions,
  DescriptionsProps,
  Radio,
  RadioChangeEvent,
  Button,
  Tree,
  Tag,
} from 'antd';
import Icon, { FolderOpenTwoTone } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import { formatSize, useI18n } from '../../utils';
import { TextDrawer } from '../TextDrawer';
import { Card } from '../Card';
import { ServerAPIProvider } from '../Manifest';
import listStyles from './list.module.scss';
import cardStyles from './card.module.scss';
import { DataSummary } from './DataSummary';
import JsSvg from '../../common/svg/file-js.svg';
import CssSvg from '../../common/svg/file-css.svg';
import HtmlSvg from '../../common/svg/file-html.svg';
import ImageSvg from '../../common/svg/file-image.svg';
import UnknownSvg from '../../common/svg/file-unknown.svg';

import { Client, SDK } from '@rsdoctor/types';
import type { TreeDataNode } from 'antd';

import styles from './bundle.module.scss';

type viewType = 'files' | 'size';

const { DirectoryTree } = Tree;

export const getFiles = (
  data: Client.RsdoctorClientAssetsSummary['all']['total'],
  fileType: 'js' | 'css' | 'image' | 'html' | 'unknown',
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

  const iconMap = {
    js: <Icon className={styles.icon} component={JsSvg} />,
    css: <Icon className={styles.icon} component={CssSvg} />,
    image: <Icon className={styles.icon} component={ImageSvg} />,
    html: <Icon className={styles.icon} component={HtmlSvg} />,
    unknown: <Icon className={styles.icon} component={UnknownSvg} />,
    imgs: <Icon className={styles.icon} component={UnknownSvg} />,
    fonts: <Icon className={styles.icon} component={UnknownSvg} />,
    media: <Icon className={styles.icon} component={UnknownSvg} />,
  };
  const treeData: TreeDataNode[] = [];
  files.forEach((file) => {
    const target = treeData.find((data) => data.title === file.defaultDir);
    const parent: TreeDataNode = target || {
      title: file.defaultDir,
      key: file.defaultDir,
      icon: <FolderOpenTwoTone />,
      children: [],
    };
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
      icon: iconMap[fileType],
    });
  });

  return {
    treeData,
  };
};

export const getFilesWithDrawer = (
  data: Client.RsdoctorClientAssetsSummary['all']['total'],
  fileType: 'js' | 'css' | 'image' | 'html' | 'unknown',
): JSX.Element => {
  const { treeData } = getFiles(data, fileType);

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
        <span className={styles.description}>
          {getFilesWithDrawer(res.js.total, 'js')}
        </span>
      ),
    },
    {
      key: 'css-files-count',
      label: 'CSS files',
      children: (
        <span className={styles.description}>
          {getFilesWithDrawer(res.css.total, 'css')}
        </span>
      ),
    },
    {
      key: 'font-files-count',
      label: 'Font files',
      children: (
        <span className={styles.description}>
          {getFilesWithDrawer(res.fonts.total, 'unknown')}
        </span>
      ),
    },
    {
      key: 'html-files-count',
      label: 'HTML files',
      children: (
        <span className={styles.description}>
          {getFilesWithDrawer(res.html.total, 'html')}
        </span>
      ),
    },
    {
      key: 'image-files-count',
      label: 'Image files',
      children: (
        <span className={styles.description}>
          {getFilesWithDrawer(res.imgs.total, 'image')}
        </span>
      ),
    },
    {
      key: 'media-files-count',
      label: 'Media files',
      children: (
        <span className={styles.description}>
          {getFilesWithDrawer(res.media.total, 'unknown')}
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
      label: 'JS size',
      children: (
        <>
          <span className={styles.description}>{jsSize}</span>
          <span className={styles.unit}>{jsSizeUnit}</span>
        </>
      ),
    },
    {
      key: 'css-files-size',
      label: 'CSS size',
      children: (
        <>
          <span className={styles.description}>{cssSize}</span>
          <span className={styles.unit}>{cssSizeUnit}</span>
        </>
      ),
    },
    {
      key: 'font-files-size',
      label: 'Font size',
      children: (
        <>
          <span className={styles.description}>{fontSize}</span>
          <span className={styles.unit}>{fontSizeUnit}</span>
        </>
      ),
    },
    {
      key: 'html-files-size',
      label: 'HTML size',
      children: (
        <>
          <span className={styles.description}>{htmlSize}</span>
          <span className={styles.unit}>{htmlSizeUnit}</span>
        </>
      ),
    },
    {
      key: 'image-files-size',
      label: 'Image size',
      children: (
        <>
          <span className={styles.description}>{imgSize}</span>
          <span className={styles.unit}>{imgSizeUnit}</span>
        </>
      ),
    },
    {
      key: 'media-files-size',
      label: 'Media size',
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
      className={listStyles.root}
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

  const handleViewChange = (e: RadioChangeEvent) => {
    setView(e.target.value);
  };

  return (
    <ServerAPIProvider
      api={SDK.ServerAPI.API.GetAssetsSummary}
      body={{ withFileContent: false }}
    >
      {(res) => {
        const totalSizeStr = formatSize(res.all.total.size);
        return (
          <Card
            title={
              <div className={styles.title}>
                <span>{t('Bundle Overall')}</span>
                <Button
                  type="link"
                  onClick={() => {
                    navigate(Client.RsdoctorClientRoutes.BundleSize);
                  }}
                >
                  View Bundler Size
                </Button>
              </div>
            }
            className={cardStyles.card}
          >
            <Radio.Group
              onChange={handleViewChange}
              value={view}
              defaultValue={view}
              style={{ marginBottom: 8 }}
            >
              <Radio.Button value="size">Size</Radio.Button>
              <Radio.Button value="files">Files</Radio.Button>
            </Radio.Group>
            <DataSummary
              theme={view === 'files' ? 'common' : 'warning'}
              number={view === 'files' ? res.all.total.count : totalSizeStr}
              description={`Total ${view}`}
            />
            <BundleDescriptions view={view} res={res} />
          </Card>
        );
      }}
    </ServerAPIProvider>
  );
};
