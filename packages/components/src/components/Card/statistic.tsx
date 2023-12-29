import React from 'react';
import { Statistic, StatisticProps } from 'antd';

import './statistic.sass';
import { useTheme } from '../../utils';

export interface StatisticCardProps {
  title: string | React.ReactNode;
  value: string | React.ReactNode;
  statisticProps?: StatisticProps;
  boxProps?: { style?: React.CSSProperties; }
}

export const StatisticCard: React.FC<StatisticCardProps> = ({ title, value, statisticProps, boxProps }) => {
  const { theme } = useTheme();

  return (
    <div className={['statistic-card', `statistic-card-${theme}`].join(' ')} {...boxProps}>
      <Statistic
        title={<div className="statistic-card-title">{title}</div>}
        valueRender={() => value}
        valueStyle={{ fontSize: 24 }}
        {...statisticProps}
      />
    </div>
  );
};
