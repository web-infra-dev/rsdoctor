/* eslint-disable react/jsx-key */
import React, { useState } from 'react';
import { Divider, Segmented, theme, Avatar, Tree } from 'antd';
import { Client, SDK } from '@rsdoctor/types';
import { RightOutlined, FileFilled, GoldenFilled } from '@ant-design/icons';

import { formatSize, useDuplicatePackagesByErrors } from '../../../utils';
import { StatisticCard } from '../../../components/Card/statistic';
import { SizeCard, bgColorType } from '../../../components/Card/size';
import Overview from '../../../components/Overall/overview';
import { ServerAPIProvider } from '../../../components/Manifest';
import { getFiles } from '../../..//components/Overall';
import { TextDrawer } from '../../..//components/TextDrawer';

import styles from './card.module.scss';

const { DirectoryTree } = Tree;
const { useToken } = theme;
const { innerWidth } = window;

interface CardProps {
  showProgress?: boolean;
  data: Client.RsdoctorClientAssetsSummary['all']['total'];
  total: number;
  tagBgColor?: string;
  type?: string;
}

const AssetCard: React.FC<CardProps> = ({
  showProgress = false,
  data,
  total,
  tagBgColor,
  type,
}) => {
  const { token } = useToken();
  const _tagBgColor = tagBgColor || token.colorPrimaryBorderHover;
  return (
    <SizeCard
      type={type!}
      files={data.files}
      total={total}
      showProgress={showProgress}
      tagBgColor={_tagBgColor}
    />
  );
};

const AssetCardContainer: React.FC<{
  type?: string;
  titles: string[];
  datas: CardProps[];
  bgColor?: bgColorType;
}> = ({ titles, datas, bgColor, type }) => {
  const [selectedTitle, setSelectedTitle] = useState(titles[0]);
  const idx = titles.indexOf(selectedTitle);
  const currentIdx = idx >= 0 ? idx : 0;
  const fileType = type || selectedTitle || titles[0];

  return (
    <StatisticCard
      title={
        <div className={styles.cardTitle}>
          <div className={styles.title}>{fileType}</div>
          {titles.length > 1 ? (
            <Segmented
              defaultValue={titles[0]}
              options={titles}
              onChange={(value) => {
                setSelectedTitle(value as string);
              }}
              size="small"
              style={{ transition: 'transform 0.3s ease' }}
              value={selectedTitle}
            />
          ) : null}
        </div>
      }
      value={
        <AssetCard
          type={fileType}
          {...datas[currentIdx]}
          tagBgColor={bgColor?.tagBgColor}
        />
      }
      boxProps={{
        style: {
          background: bgColor?.bgColor,
          width: innerWidth > 1300 ? '80%' : '95%',
        },
      }}
    />
  );
};

export const BundleCards: React.FC<{
  cwd: string;
  errors: SDK.ErrorsData;
  summary: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetAssetsSummary>;
}> = ({ errors, summary }) => {
  const duplicatePackages = useDuplicatePackagesByErrors(errors);
  const [totalSize, totalSizeUnit] = formatSize(summary.all.total.size).split(
    ' ',
  );

  const arr = [
    <AssetCardContainer
      type={'JS'}
      titles={['Total', 'Initial']}
      datas={[
        {
          data: summary.js.total,
          total: summary.all.total.size,
          showProgress: true,
        },
        {
          data: summary.js.initial,
          total: summary.all.total.size,
          showProgress: true,
        },
      ]}
    />,
    <AssetCardContainer
      type={'CSS'}
      titles={['Total', 'Initial']}
      datas={[
        {
          data: summary.css.total,
          total: summary.all.total.size,
          showProgress: true,
        },
        {
          data: summary.css.initial,
          total: summary.all.total.size,
          showProgress: true,
        },
      ]}
    />,
    <AssetCardContainer
      titles={['Images', 'Fonts', 'Media']}
      datas={[
        {
          data: summary.imgs.total,
          total: summary.all.total.size,
          showProgress: true,
        },
        {
          data: summary.fonts.total,
          total: summary.all.total.size,
          showProgress: true,
        },
        {
          data: summary.media.total,
          total: summary.all.total.size,
          showProgress: true,
        },
      ]}
    />,
    <AssetCardContainer
      type={'HTML'}
      titles={['HTML Files']}
      datas={[
        {
          data: summary.html.total,
          total: summary.all.total.size,
          showProgress: true,
        },
      ]}
    />,
  ];

  return (
    <ServerAPIProvider
      api={SDK.ServerAPI.API.GetAssetsSummary}
      body={{ withFileContent: false }}
    >
      {(res) => {
        const { treeData } = getFiles(res['all'].total);
        return (
          <div className={styles.container}>
            <div className={styles.summary}>
              <Overview
                title={
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
                      <div style={{ color: '#000000a6' }}>
                        <span style={{ marginRight: '5px' }}>Total Files</span>
                        <RightOutlined />
                      </div>
                    }
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
                }
                description={
                  <>
                    <span className={styles.description}>{totalSize}</span>
                    <span className={styles.unit}>{totalSizeUnit}</span>
                    <div className={styles.totalNumber}>
                      <span style={{ marginRight: '7px' }}>
                        Number of files
                      </span>
                      <span style={{ fontWeight: 500 }}>
                        {summary.all.total.count}
                      </span>
                    </div>
                  </>
                }
                icon={
                  <Avatar
                    style={{ background: '#3874F6' }}
                    shape="circle"
                    icon={<FileFilled style={{ fontSize: '18px' }} />}
                  />
                }
                style={{
                  marginBottom: '12px',
                  minWidth: '210px',
                }}
              />
              <Overview
                style={{ minWidth: '210px' }}
                title={
                  <div style={{ margin: '4px 0' }}>
                    <span style={{ marginRight: '5px' }}>
                      Duplicate Packages
                    </span>
                  </div>
                }
                description={duplicatePackages.length}
                icon={
                  <Avatar
                    style={{ background: '#13C2C2' }}
                    shape="circle"
                    icon={<GoldenFilled style={{ fontSize: '18px' }} />}
                  />
                }
              />
            </div>
            <Divider style={{ height: '200px' }} type="vertical" />
            <div className={styles.chartsContainer}>
              {arr.map((e, idx) => (
                <>
                  <div key={idx} className={styles.chart}>
                    {e}
                  </div>
                  {idx !== arr.length - 1 ? (
                    <Divider
                      key={`${idx}-divider`}
                      style={{ height: '200px' }}
                      type="vertical"
                    />
                  ) : null}
                </>
              ))}
            </div>
          </div>
        );
      }}
    </ServerAPIProvider>
  );
};
