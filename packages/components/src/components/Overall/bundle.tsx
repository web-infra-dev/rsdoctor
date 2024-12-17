import React, { useMemo, useState } from 'react';
import {
  Space,
  Typography,
  Tag,
  Descriptions,
  DescriptionsProps,
  Radio,
  RadioChangeEvent,
  Button,
} from 'antd';
import { Client, SDK } from '@rsdoctor/types';
import { useNavigate } from 'react-router-dom';

import { createFileStructures, formatSize, useI18n } from '../../utils';
import { TextDrawer } from '../TextDrawer';
import { Card } from '../Card';
import { ServerAPIProvider } from '../Manifest';
import { FileTree } from '../FileTree';
import listStyles from './list.module.scss';
import cardStyles from './card.module.scss';
import { DataSummary } from './DataSummary';

import styles from './bundle.module.scss';

type viewType = 'files' | 'size';

const getFilesWithDrawer = (
  data: Client.RsdoctorClientAssetsSummary['all']['total'],
): JSX.Element => {
  const fileStructures = useMemo(() => {
    if (!data.files.length) return [];
    return createFileStructures({
      files: data.files.map((e) => e.path),
      fileTitle(file, basename) {
        const { size, initial } = data.files.find((e) => e.path === file)!;
        return (
          <Space>
            <Typography.Text>{basename}</Typography.Text>
            <Tag color="success" style={{ marginRight: 0 }}>
              {formatSize(size)}
            </Tag>
            {initial ? <Tag color="cyan">Initial</Tag> : null}
          </Space>
        );
      },
    });
  }, [data.files]);

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
          text={<span>{data.count}</span>}
        >
          <FileTree treeData={fileStructures} defaultExpandAll />
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
          {getFilesWithDrawer(res.js.total)}
        </span>
      ),
    },
    {
      key: 'css-files-count',
      label: 'CSS files',
      children: (
        <span className={styles.description}>
          {getFilesWithDrawer(res.css.total)}
        </span>
      ),
    },
    {
      key: 'font-files-count',
      label: 'Font files',
      children: (
        <span className={styles.description}>
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
