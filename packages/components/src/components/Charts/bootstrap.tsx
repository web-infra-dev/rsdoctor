import React from 'react';
import { Space } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import { SDK } from '@rsdoctor/types';
import { TextDrawer } from '../TextDrawer';

import './loader.scss';
import './tooltips.scss';
import {
  CommonChartProps,
  CommonExecutionEmptyTips,
  CommonExecutionsChart,
} from './common';
import { ServerAPIProvider } from '../Manifest';
import { Summary } from '@rsdoctor/utils/common';
import { ChartTypes } from './constants';

export const BootstrapChartContainer: React.FC<CommonChartProps> = ({
  summary,
}) => {
  const { costs = [] } = summary || {};
  const target = costs.find(
    (e) => e.name === Summary.SummaryCostsDataName.Bootstrap,
  );

  const hooks: string[] = [
    'environment',
    'afterEnvironment',
    'entryOption',
    'afterPlugins',
    'afterResolvers',
    'initialize',
    'beforeRun',
    'run',
    'watchRun',
    'normalModuleFactory',
    'contextModuleFactory',
    'beforeCompile',
  ];

  if (!target) return null;

  return (
    <TextDrawer
      containerProps={{ style: { display: 'inline' } }}
      drawerProps={{ title: 'Chart of the "Bootstrap -> BeforeCompile" stage' }}
      text={
        <Space>
          detail
          <BarChartOutlined />
        </Space>
      }
    >
      <ServerAPIProvider api={SDK.ServerAPI.API.GetPluginData} body={{ hooks }}>
        {(res) =>
          res && res.length ? (
            <CommonExecutionsChart plugins={res} type={ChartTypes.Bootstrap} />
          ) : (
            <CommonExecutionEmptyTips />
          )
        }
      </ServerAPIProvider>
    </TextDrawer>
  );
};
