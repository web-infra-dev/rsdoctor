/* eslint-disable react/jsx-key */
import React, { useState } from 'react';
import { Col, Row, Segmented } from 'antd';
import { Client, SDK } from '@rsdoctor/types';
import { useDuplicatePackagesByErrors } from '../../../utils';
import { Size } from '../../../constants';
import { StatisticCard } from '../../../components/Card/statistic';
import { DuplicatePackageDrawerWithServer } from '../../../components/TextDrawer';
import { SizeCard } from '../../../components/Card/size';

const height = 100;

interface CardProps {
  showProgress?: boolean;
  data: Client.DoctorClientAssetsSummary['all']['total'];
  total: number;
}

const AssetCard: React.FC<CardProps> = ({ showProgress = false, data, total }) => {
  return <SizeCard files={data.files} total={total} showProgress={showProgress} />;
};

const AssetCardContainer: React.FC<{ titles: string[]; datas: CardProps[] }> = ({ titles, datas }) => {
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
      value={datas.map((e, i) => <AssetCard {...e} key={i} />)[idx]}
    />
  );
};

export const BundleCards: React.FC<{
  cwd: string;
  errors: SDK.ErrorsData;
  summary: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetAssetsSummary>;
}> = ({ cwd, errors, summary }) => {
  const duplicatePackages = useDuplicatePackagesByErrors(errors);

  const arr = [
    <AssetCardContainer
      titles={['Total Files']}
      datas={[
        {
          data: summary.all.total,
          total: summary.all.total.size,
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
    <Row gutter={[Size.BasePadding, Size.BasePadding]} wrap style={{ marginBottom: Size.BasePadding }}>
      {arr.map((e, i) => (
        <Col key={i} style={{ minWidth: 300 }}>
          {e}
        </Col>
      ))}
    </Row>
  );
};
