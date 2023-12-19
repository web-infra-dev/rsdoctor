import React, { useMemo, useRef } from 'react';
import { groupBy } from 'lodash-es';
import { Empty } from 'antd';
import { SDK } from '@rsdoctor/types';
import './loader.scss';
import { useTheme } from 'src/utils/manifest';
import { findLoaderTotalTiming } from 'src/utils/loader';
import { beautifyPath } from 'src/utils/file';
import { TimelineCom } from './TimelineCharts';

// TODO: process dimension chart
export interface ChartProps {
  loaders: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetLoaderChartData>;
  cwd: string;
}

export interface CommonMetricPart<T extends string = string> {
  _n?: boolean;
  _c?: string;
  p: string;
  n: T;
  ext?: unknown;
}
export interface DurationMetric extends CommonMetricPart {
  _r?: [start: string, end: string];
  s: number;
  e: number;
  c?: DurationMetric[];
}

export const LoaderExecutionsChart: React.FC<ChartProps> = ({ loaders, cwd }) => {
  const { isDark } = useTheme();
  const ref = useRef(null);

  const groupByLoader = useMemo(() => groupBy(loaders, (e) => e.loader), [loaders]);

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
  console.log('data:::::', data);

  if (!data.length) return <Empty />;

  return (
    <div
      className={['loader-chart-container', isDark ? 'loader-chart-container_dark' : ''].join(' ').trim()}
      ref={ref}
      style={{ width: '100%', height: '600px' }}
    >
      <TimelineCom loaderData={data} cwd={cwd} loaders={loaders} />
    </div>
  );
};
