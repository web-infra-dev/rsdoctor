import { Space, Typography, Tag, Row, Col, Descriptions, DescriptionsProps } from 'antd';
import React, { useMemo } from 'react';
import { Client, SDK } from '@rsdoctor/types';
import { ExceptionOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { createFileStructures, formatSize, useDuplicatePackagesByErrors, useI18n } from '../../utils';
import { DuplicatePackageDrawerWithServer, TextDrawer } from '../TextDrawer';
import { Card } from '../Card';
import { ServerAPIProvider } from '../Manifest';
import { FileTree } from '../FileTree';
import listStyles from './list.module.scss';
import cardStyles from './card.module.scss';
import numberButtonStyles from './NumberButton.module.scss';
import { NumberButton } from './NumberButton';

const getFilesWithDrawer = (data: Client.DoctorClientAssetsSummary['all']['total']): JSX.Element => {
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
            {initial ? <Tag color="cyan">initial</Tag> : null}
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
          text={
            <>
              {data.count} <ExceptionOutlined />
            </>
          }
        >
          <FileTree treeData={fileStructures} defaultExpandAll />
        </TextDrawer>
      ) : (
        data.count
      )}
    </>
  );
};

const BundleDescriptions = ({ res }: { res: Client.DoctorClientAssetsSummary }) => {
  const items: DescriptionsProps['items'] = [
    {
      key: 'total-files-count',
      label: 'Total files',
      children: res.all.total.count,
    },
    {
      key: 'total-files-size',
      label: '',
      children: '',
    },
    {
      key: 'js-files-count',
      label: 'JS files',
      children: getFilesWithDrawer(res.js.total),
    },
    {
      key: 'js-files-size',
      label: 'JS size',
      children: formatSize(res.js.total.size),
    },
    {
      key: 'css-files-count',
      label: 'CSS files',
      children: getFilesWithDrawer(res.css.total),
    },
    {
      key: 'css-files-size',
      label: 'CSS size',
      children: formatSize(res.css.total.size),
    },
    {
      key: 'font-files-count',
      label: 'Font files',
      children: getFilesWithDrawer(res.fonts.total),
    },
    {
      key: 'font-files-size',
      label: 'Font size',
      children: formatSize(res.fonts.total.size),
    },
    {
      key: 'html-files-count',
      label: 'HTML files',
      children: getFilesWithDrawer(res.html.total),
    },
    {
      key: 'html-files-size',
      label: 'HTML size',
      children: formatSize(res.html.total.size),
    },
    {
      key: 'image-files-count',
      label: 'Image files',
      children: getFilesWithDrawer(res.imgs.total),
    },
    {
      key: 'image-files-size',
      label: 'Image size',
      children: formatSize(res.imgs.total.size),
    },
    {
      key: 'media-files-count',
      label: 'Media files',
      children: getFilesWithDrawer(res.media.total),
    },
    {
      key: 'media-files-size',
      label: 'Media size',
      children: formatSize(res.media.total.size),
    },
  ];

  return <Descriptions className={listStyles.root} size="small" column={2} items={items} />;
};

export const BundleOverall: React.FC<{
  errors: SDK.ErrorsData;
  cwd: string;
}> = ({ errors, cwd }): JSX.Element | null => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const duplicatePackages = useDuplicatePackagesByErrors(errors);

  return (
    <ServerAPIProvider api={SDK.ServerAPI.API.GetAssetsSummary} body={{ withFileContent: false }}>
      {(res) => {
        const totalSizeStr = formatSize(res.all.total.size);
        return (
          <Card title={t('Bundle Overall')} className={cardStyles.card}>
            <Row gutter={16}>
              <Col span={12} className={numberButtonStyles.container}>
                <NumberButton
                  theme="success"
                  number={totalSizeStr}
                  description="Total Size"
                  numberFontSize="30px"
                  onClick={() => {
                    navigate(Client.DoctorClientRoutes.BundleSize);
                  }}
                />
              </Col>
              <Col span={12} className={numberButtonStyles.container}>
                <DuplicatePackageDrawerWithServer
                  cwd={cwd}
                  duplicatePackages={duplicatePackages}
                  button={
                    <NumberButton
                      theme={duplicatePackages.length === 0 ? 'success' : 'warning'}
                      number={duplicatePackages.length}
                      description="Duplicate Packages"
                    />
                  }
                />
              </Col>
            </Row>
            <BundleDescriptions res={res} />
          </Card>
        );
      }}
    </ServerAPIProvider>
  );
};
