import { Divider, Space, Typography, Progress } from 'antd';
import React from 'react';
import { Summary } from '@rsdoctor/utils/common';
import { SDK } from '@rsdoctor/types';
import { formatCosts, useI18n } from '../../utils';
import { Card } from '../Card';
// import { BootstrapChartContainer, DoneChartContainer, MinifyChartContainer } from '../Charts'; TODO: Replace chart component library
import styles from './compile.module.scss';
import cardStyles from './card.module.scss';

const Stage: React.FC<
  React.PropsWithChildren<{
    name: string;
    showDivider?: boolean;
  }>
> = ({ children, name, showDivider = true }) => {
  return (
    <Typography.Text style={{ color: 'inherit' }}>
      <Typography.Text style={{ color: 'inherit' }}>{name}</Typography.Text>
      {showDivider ? <Divider type="vertical" /> : null}
      {children}
    </Typography.Text>
  );
};

const getProgressColor = (percent: number) => {
  if (percent < 33.3) {
    return { '0%': '#95de64', '100%': '#5cdbd3' };
  }
  return { '0%': '#ff9c6e', '100%': '#ff7875' };
};

export const CompileOverall: React.FC<{ summary: SDK.SummaryData }> = ({ summary }) => {
  const { t } = useI18n();

  if (!summary?.costs?.length) return null;

  const maxCosts = Math.max(...summary.costs.map((item) => item.costs));

  return (
    <Card title={t('Compile Overall')} className={cardStyles.card}>
      <Space style={{ wordBreak: 'break-all', width: '100%' }} size={20} direction="vertical">
        {summary.costs.map((e) => {
          const { name, costs } = e;
          const percent = (costs * 100) / maxCosts;

          const ProgressBar = (
            <Progress
              className={styles.progress}
              percent={percent}
              status="normal"
              strokeColor={getProgressColor(percent)}
              format={() => formatCosts(costs)}
            />
          );

          switch (name) {
            case Summary.SummaryCostsDataName.Bootstrap:
              return (
                <Stage name="Bootstrap ~ BeforeCompile" key={name}>
                  {/* <BootstrapChartContainer summary={summary} /> */}
                  {ProgressBar}
                </Stage>
              );
            case Summary.SummaryCostsDataName.Compile:
              return (
                <Stage name="Compile" key={name} showDivider={false}>
                  {ProgressBar}
                </Stage>
              );
            case Summary.SummaryCostsDataName.Done:
              return (
                <Stage name="AfterCompile ~ Done" key={name}>
                  {/* <DoneChartContainer summary={summary} /> */}
                  {ProgressBar}
                </Stage>
              );
            case Summary.SummaryCostsDataName.Minify:
              return (
                <Stage name="Minify" key={name}>
                  {/* <MinifyChartContainer summary={summary} /> */}
                  {ProgressBar}
                </Stage>
              );

            default:
              return null;
          }
        })}
      </Space>
    </Card>
  );
};
