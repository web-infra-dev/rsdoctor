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
    <div {...boxProps}>
      <Statistic
        title={<div>{title}</div>}
        valueRender={() => <div>{value}</div>}
        valueStyle={{ fontSize: 24 }}
        {...statisticProps}
      />
    </div>
  );
};
