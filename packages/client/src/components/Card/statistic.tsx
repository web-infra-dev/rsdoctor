import { Statistic, StatisticProps } from 'antd';

export interface StatisticCardProps {
  title: string | React.ReactNode;
  value: string | React.ReactNode;
  statisticProps?: StatisticProps;
  boxProps?: { style?: React.CSSProperties };
}

export const StatisticCard: React.FC<StatisticCardProps> = ({
  title,
  value,
  statisticProps,
  boxProps,
}) => {
  return (
    <div className="statistic-card" {...boxProps}>
      <Statistic
        title={<div className="statistic-card-title">{title}</div>}
        valueRender={() => value}
        valueStyle={{ fontSize: 24 }}
        {...statisticProps}
      />
    </div>
  );
};
