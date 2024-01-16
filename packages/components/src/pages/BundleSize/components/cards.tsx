/* eslint-disable react/jsx-key */
import React, { useState } from 'react';
import { Col, Row, Segmented, theme } from 'antd';
import { Client, SDK } from '@rsdoctor/types';
import { useDuplicatePackagesByErrors, useWindowWidth } from '../../../utils';
import { Size } from '../../../constants';
import { StatisticCard } from '../../../components/Card/statistic';
import { DuplicatePackageDrawerWithServer } from '../../../components/TextDrawer';
import { SizeCard, bgColorType } from '../../../components/Card/size';

const { useToken } = theme;
const height = 100;

interface CardProps {
  showProgress?: boolean;
  data: Client.RsdoctorClientAssetsSummary['all']['total'];
  total: number;
  tagBgColor?: string;
}

const AssetCard: React.FC<CardProps> = ({ showProgress = false, data, total, tagBgColor }) => {
  const { token } = useToken();
  const _tagBgColor = tagBgColor || token.colorPrimaryBorderHover;
  return (<SizeCard files={data.files} total={total} showProgress={showProgress} tagBgColor={_tagBgColor } />);
};

const AssetCardContainer: React.FC<{ titles: string[]; datas: CardProps[]; bgColor?: bgColorType }> = ({ titles, datas, bgColor }) => {
  const [idx, setIdx] = useState(0);

  return (
    <StatisticCard
      title={
        titles.length > 1 ? (
          <Segmented
            defaultValue={titles[idx]}
            options={titles}
            onChange={(e) => {
              setIdx(titles.indexOf(e as string));
            }}
            size="small"
            style={{ transition: 'transform 0.3s ease' }}
            value={titles[idx] || titles[0]}
          />
        ) : (
          titles[idx]
        )
      }
      value={datas.map((e, i) => <AssetCard {...e} key={i}  tagBgColor={bgColor?.tagBgColor} />)[idx]}
      boxProps={{
        style: { background: bgColor?.bgColor }
      }}
    />
  );
};

export const BundleCards: React.FC<{
  cwd: string;
  errors: SDK.ErrorsData;
  summary: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetAssetsSummary>;
}> = ({ cwd, errors, summary }) => {
  const windowWith = useWindowWidth();
  const duplicatePackages = useDuplicatePackagesByErrors(errors);

  const arr = [
    <AssetCardContainer
      titles={['Total Files']}
      datas={[
        {
          data: summary.all.total,
          total: summary.all.total.size,
          showProgress: true,
        },
      ]}
    />,
    <AssetCardContainer
      titles={['Total JS', 'Initial JS']}
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
      titles={['Total CSS', 'Initial CSS']}
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
      titles={['HTML Files']}
      datas={[
        {
          data: summary.html.total,
          total: summary.all.total.size,
          showProgress: true,
        },
      ]}
    />,
    <StatisticCard
      title={'Duplicate Packages'}
      value={
        <DuplicatePackageDrawerWithServer buttonStyle={{ height }} duplicatePackages={duplicatePackages} cwd={cwd} />
      }
    />,
  ];

  return (
    <Row gutter={ windowWith > 1200 && windowWith < 1400 ? [Size.BasePadding * 2, Size.BasePadding] : [Size.BasePadding, Size.BasePadding]} wrap style={{ marginBottom: Size.BasePadding }}>
      {arr.map((e, i) => (
        <Col key={i} span={windowWith > 1500 ? 4 : windowWith > 1200 ? 8 : 8}>
          {e}
        </Col>
      ))}
    </Row>
  );
};
