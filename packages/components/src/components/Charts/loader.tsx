import React, {
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useState,
} from 'react';
import { groupBy } from 'lodash-es';
import { Empty } from 'antd';
import './loader.scss';
import { useTheme } from 'src/utils/manifest';
import { findLoaderTotalTiming } from 'src/utils/loader';
import { beautifyPath } from 'src/utils/file';
import { TimelineCom } from './TimelineCharts';
import { ChartProps, DurationMetric } from './types';
import {
  renderTotalLoadersTooltip,
  getTooltipHtmlForLoader,
  useDebounceHook,
} from './utils';
import { ChartTypes } from './constants';
let startTimestamp = 0;
let endTimestamp = 0;

export const LoaderExecutionsChart: React.FC<ChartProps> = ({
  loaders,
  cwd,
}) => {
  const { isDark } = useTheme();
  const ref = useRef(null);
  const [data, setData] = useState([] as DurationMetric[]);
  const durationMetricData = useDebounceHook(data, 200);
  // const [endTimestamp, setEndTimestamp] = useState(0);

  const groupByLoader = useMemo(
    () => groupBy(loaders, (e) => e.loader),
    [loaders],
  );

  const formatterForLoader = useCallback((raw: any) => {
    const { name, data } = raw;
    const loaderName = name.replace(' total', '');
    if (data?.ext) {
      return getTooltipHtmlForLoader(data.ext as (typeof loaders)[0]);
    }

    return renderTotalLoadersTooltip(loaderName, loaders, cwd);
  }, []);

  useEffect(() => {
    const _data = Object.keys(groupByLoader).map<DurationMetric>(
      (loaderName) => {
        const list = groupByLoader[loaderName] || [];
        const { start, end } = findLoaderTotalTiming(list);

        if (start < startTimestamp || startTimestamp === 0) {
          startTimestamp = start;
        }

        if (end > endTimestamp || endTimestamp === 0) {
          endTimestamp = end;
        }

        return {
          p: loaderName,
          n: loaderName,
          s: start,
          e: end,
          c: list.map((e) => {
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
      },
    );
    setData(_data);
  }, [groupByLoader]);

  return (
    <>
      {data?.length ? (
        <div
          className={[
            'loader-chart-container',
            isDark ? 'loader-chart-container_dark' : '',
          ]
            .join(' ')
            .trim()}
          ref={ref}
          style={{ width: '100%' }}
        >
          <TimelineCom
            loaderData={durationMetricData}
            formatterFn={formatterForLoader}
            chartType={ChartTypes.Loader}
            exts={{ startTimestamp, endTimestamp }}
          />
        </div>
      ) : (
        <Empty />
      )}
    </>
  );
};
