import React, { useCallback, useMemo, useRef } from 'react';
import { groupBy } from 'lodash-es';
import { Empty } from 'antd';
import './loader.scss';
import { useTheme } from 'src/utils/manifest';
import { findLoaderTotalTiming } from 'src/utils/loader';
import { beautifyPath } from 'src/utils/file';
import { TimelineCom } from './TimelineCharts';
import { ChartProps, DurationMetric } from './types';
import {  renderTotalLoadersTooltip, getTooltipHtmlForLoader } from './utils';

// TODO: process dimension chart

export const LoaderExecutionsChart: React.FC<ChartProps> = ({ loaders, cwd }) => {
  const { isDark } = useTheme();
  const ref = useRef(null);

  const groupByLoader = useMemo(() => groupBy(loaders, (e) => e.loader), [loaders]);
  
  const formatterForLoader =  useCallback((raw: any) => {
    const { name, data } = raw;
    const loaderName = name.replace(' total', '');
    if (data?.ext) {
      return getTooltipHtmlForLoader(data.ext as typeof loaders[0]);
    }
  
    return renderTotalLoadersTooltip(loaderName, loaders, cwd);
  }, []);
  
  const data = useMemo(() => {
    return Object.keys(groupByLoader).map<DurationMetric>((loaderName) => {
      const list = groupByLoader[loaderName] || [];
      if (list.length === 1) {
        const { startAt, endAt } = list[0];
        return {
          p: loaderName,
          n: loaderName,
          s: startAt,
          e: endAt,
        };
      }

      const { start, end } = findLoaderTotalTiming(list);

      return {
        p: loaderName,
        n: loaderName,
        s: start,
        e: end,
        c: list.map<any>((e) => {
          return {
            p: loaderName,
            // n: loaderName,
            n: beautifyPath(e.resource, cwd),
            s: e.startAt,
            e: e.endAt,
            ext: e,
          };
        }),
      };
    });
  }, [groupByLoader]);

  if (!data.length) return <Empty />;

  return (
    <div
      className={['loader-chart-container', isDark ? 'loader-chart-container_dark' : ''].join(' ').trim()}
      ref={ref}
      style={{ width: '100%', height: '600px' }}
    >
      <TimelineCom loaderData={data} formatterFn={formatterForLoader} chartType={'loader'} />
    </div>
  );
};
