import { BarChartOutlined } from '@ant-design/icons';
import { SDK } from '@rsdoctor/types';
import { Divider, Space } from 'antd';
import React from 'react';
import { TextDrawer } from '../TextDrawer';
import { Summary } from '@rsdoctor/utils/common';
import { Card } from '../Card';
import { ServerAPIProvider } from '../Manifest';
import { WebpackPluginsDataTable } from '../Plugins/webpack';
import {
  CommonChartProps,
  CommonExecutionEmptyTips,
  CommonExecutionsChart,
} from './common';
import { ChartTypes } from './constants';

import './loader.scss';
import './tooltips.scss';

export const MinifyChartContainer: React.FC<CommonChartProps> = ({
  summary,
}) => {
  const hooks: Array<string> = ['processAssets', 'optimizeChunkAssets'];
  const { costs = [] } = summary || {};
  const target = costs.find(
    (e) => e.name === Summary.SummaryCostsDataName.Minify,
  );

  if (!target) return null;
  return (
    <TextDrawer
      containerProps={{ style: { display: 'inline' } }}
      drawerProps={{ title: 'Details of the "Minify" stage' }}
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
            <Space direction="vertical" style={{ width: '100%' }}>
              <Card title='Plugin DataSource of the "Minify"' collapsable>
                <WebpackPluginsDataTable dataSource={res} />
              </Card>
              <Divider />
              <Card title='Chart of the "Minify"'>
                <CommonExecutionsChart plugins={res} type={ChartTypes.Minify} />
              </Card>
            </Space>
          ) : (
            <CommonExecutionEmptyTips />
          )
        }
      </ServerAPIProvider>
    </TextDrawer>
  );
};
