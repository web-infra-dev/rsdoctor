import React from 'react';
import { Divider, Space } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import { SDK } from '@rsdoctor/types';
import { Summary } from '@rsdoctor/utils/common';
import { TextDrawer } from '../TextDrawer';
import { Card } from '../Card';
import {
  CommonChartProps,
  CommonExecutionsChart,
  CommonExecutionEmptyTips,
} from './common';
import { WebpackPluginsDataTable } from '../Plugins/webpack';
import { ServerAPIProvider } from '../Manifest';

import './loader.scss';
import './tooltips.scss';

export const DoneChartContainer: React.FC<CommonChartProps> = ({
  summary,
}): JSX.Element | null => {
  const { costs = [] } = summary || {};
  const target = costs.find(
    (e) => e.name === Summary.SummaryCostsDataName.Done,
  );

  const hooks: Array<string> = [
    'afterCompile',
    'shouldEmit',
    'emit',
    'afterEmit',
    'assetEmitted',
    'done',
  ];

  const suffix = 'of the "AfterCompile -> Done" stage';

  if (!target) return null;

  return (
    <TextDrawer
      containerProps={{ style: { display: 'inline' } }}
      drawerProps={{ title: `Details ${suffix}` }}
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
              <Card title={`Plugin DataSource of ${suffix}`} collapsable>
                <WebpackPluginsDataTable dataSource={res} />
              </Card>
              <Divider />
              <Card title={`Chart ${suffix}`}>
                <CommonExecutionsChart plugins={res} />
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
