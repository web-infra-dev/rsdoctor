import { Client } from '@rsdoctor/types';
import { Segmented, Space, Tooltip, Typography } from 'antd';
import { Graph } from '@rsdoctor/utils/common';
import React, { useState } from 'react';
import { formatSize } from '../../utils';
import { Color } from '../../constants';
import { StatisticCard } from './statistic';

export interface DiffCardProps extends Pick<DiffCardContentProps, 'formatter'> {
  titles: Array<string> | [string | React.ReactNode];
  datas: Array<DiffCardContentProps['data']>;
  showPercentInTitle?: boolean;
}

export interface DiffCardContentProps {
  data: Client.DoctorClientAssetsDiffItem;
  formatter?(v: number, target: 'baseline' | 'current'): number | string | React.ReactNode;
}

export interface PercentProps {
  percent: number;
  state: Client.DoctorClientDiffState;
  fontSize?: React.CSSProperties['fontSize'];
}

export const SizePercent: React.FC<
  {
    baseline: number;
    current: number;
  } & Omit<PercentProps, 'percent' | 'state'>
> = ({ baseline, current, ...rest }) => {
  const diff = Graph.diffSize(baseline, current);
  return <Percent {...rest} {...diff} />;
};

export const Percent: React.FC<PercentProps> = ({ percent, state, fontSize = 14 }) => {
  const _percent = +percent.toFixed(2);

  if (_percent > 0) {
    const percentText = `${_percent}`;

    if (state === Client.DoctorClientDiffState.Up) {
      return (
        <Typography.Text strong style={{ fontSize, color: Color.Red }}>
          +{percentText}%
        </Typography.Text>
      );
    }

    if (state === Client.DoctorClientDiffState.Down) {
      return (
        <Typography.Text strong style={{ fontSize, color: Color.Green }}>
          -{percentText}%
        </Typography.Text>
      );
    }
  }

  return null;
};

export const DiffCardContent: React.FC<DiffCardContentProps> = ({ data, formatter }) => {
  const { percent, state, size } = data;
  const { baseline, current } = size;

  const bSize = formatter ? formatter(baseline, 'baseline') : formatSize(baseline);
  const cSize = formatter ? formatter(current, 'current') : formatSize(current);

  return (
    <Space align="start">
      <Space direction="vertical" style={{ textAlign: 'left' }}>
        <Space>
          <Typography.Text style={{ fontSize: 10, color: 'inherit' }} keyboard>
            Current
          </Typography.Text>
          <Tooltip
            title={typeof cSize === 'number' || typeof cSize === 'string' ? `Value of Current is ${cSize}` : undefined}
          >
            <Typography.Text style={{ fontSize: 16, color: 'inherit' }} strong>
              {cSize}
            </Typography.Text>
          </Tooltip>
          <Percent percent={percent} state={state} />
        </Space>
        <Space>
          <Typography.Text style={{ fontSize: 10, color: 'inherit' }} keyboard>
            Baseline
          </Typography.Text>
          <Tooltip
            title={typeof bSize === 'number' || typeof bSize === 'string' ? `Value of Baseline is ${bSize}` : undefined}
          >
            <Typography.Text style={{ fontSize: 14 }} type="secondary">
              {bSize}
            </Typography.Text>
          </Tooltip>
        </Space>
      </Space>
    </Space>
  );
};

export const DiffCard: React.FC<DiffCardProps> = ({ titles, datas, formatter, showPercentInTitle }) => {
  const [idx, setIdx] = useState(0);

  return (
    <StatisticCard
      title={
        titles.length > 1 ? (
          <Segmented
            defaultValue={titles[idx] as string}
            options={
              showPercentInTitle
                ? titles.map((e, i) => {
                    const data = datas[i];

                    return {
                      label: (
                        <Space>
                          <Typography.Text>{e}</Typography.Text>
                          <Percent percent={data.percent} state={data.state} />
                        </Space>
                      ),
                      value: e as string,
                    };
                  })
                : (titles as string[])
            }
            onChange={(e) => {
              setIdx(titles.indexOf(e as string));
            }}
            size="small"
            style={{ transition: 'transform 0.3s ease' }}
            value={(titles[idx] || titles[0]) as string}
          />
        ) : (
          titles[idx]
        )
      }
      value={<DiffCardContent data={datas[idx]} formatter={formatter} />}
      statisticProps={{
        style: { textAlign: 'left' },
      }}
    />
  );
};
