import { SDK } from '@rsdoctor/types';
import { Alert, Typography } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../utils';
import { TimelineCom } from './TimelineCharts';

import './loader.scss';
import './tooltips.scss';
import { DurationMetric, ITraceEventData, Metric } from './types';
import { formatterForPlugins, processTrans } from './utils';

export interface CommonChartProps {
  summary: SDK.SummaryData;
}

export const CommonExecutionsChart: React.FC<{
  plugins: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetPluginData>;
  defaultDatas?: Metric[];
}> = ({ plugins, defaultDatas = [] }) => {
  const { isDark } = useTheme();
  const ref = useRef(null);
  const [data, setData] = useState([] as ITraceEventData[])

  useEffect(() => {
    const arr: Metric[] = [];

    plugins.forEach((item) => {
      item.data.forEach((el) => {
        arr.push({
          p: item.hook,
          n: `${item.tapName}`,
          s: el.startAt,
          e: el.endAt,
        });
      });
    });

    setData([
      ...processTrans(defaultDatas as DurationMetric[]),
      ...processTrans(arr as DurationMetric[]),
    ]);
  }, []);

  return (
    <div
      className={['loader-chart-container', isDark ? 'loader-chart-container_dark' : ''].join(' ').trim()}
      ref={ref}
      style={{ width: '100%', height: '600px' }}
    >
      <TimelineCom pluginsData={data} formatterFn={formatterForPlugins} />
    </div>
  );
};

export const CommonExecutionEmptyTips: React.FC = () => {
  return (
    <Alert
      message={
        <Typography.Text>
          <Typography.Text>make sure that you have turn on </Typography.Text>
          {/* <Typography.Text code> TODO::
            <a
              href={`http://${tccConfig.webDoctorHost}/api/webpack-plugin.html#features`}
              target="_blank"
              rel="noreferrer"
            >
              features.plugins
            </a>
          </Typography.Text> */}
          <Typography.Text> in configuration for the Rsdoctor plugin.</Typography.Text>
        </Typography.Text>
      }
      type="info"
      showIcon
    />
  );
};
