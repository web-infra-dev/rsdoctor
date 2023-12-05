import { SDK } from '@rsdoctor/types';
import { Divider, Row, Select, Space, Typography } from 'antd';
import { pick } from 'lodash-es';
import React, { useState } from 'react';
import ReactJson from 'react-json-view';
import { useWebpackConfigurationByConfigs } from '../../utils';
import { withServerAPI } from '../Manifest';
import { TextDrawer } from '../TextDrawer';
import { Title } from '../Title';

interface WebpackConfigurationViewerBaseProps {
  defaultKeys?: string[];
  configs: SDK.ConfigData;
}

export const WebpackConfigurationViewerBase: React.FC<WebpackConfigurationViewerBaseProps> = ({
  defaultKeys,
  configs,
}) => {
  const webpackData = useWebpackConfigurationByConfigs(configs || []);

  if (!webpackData) return null;

  const { config: webpack, version } = webpackData;
  const keys = Object.keys(webpack);
  const [selectKeys, setSelectKeys] = useState<string[]>(defaultKeys || keys);

  return (
    <TextDrawer text="View Webpack Config">
      <Row>
        <Title text={`Webpack Config Viewer`} />
        <Divider />
        <Space>
          <Typography.Text>Properties: </Typography.Text>
          <Select
            dropdownStyle={{ zIndex: 999 }}
            mode="multiple"
            allowClear
            value={selectKeys.length === keys.length ? [] : selectKeys}
            style={{ width: 350 }}
            dropdownMatchSelectWidth
            placeholder={'Show Selected Properties Only.'}
            onChange={(e) => {
              setSelectKeys(e);
            }}
          >
            {keys.map((e) => {
              return (
                <Select.Option key={e} label={e} value={e}>
                  {e}
                </Select.Option>
              );
            })}
          </Select>
        </Space>
        <Divider />
        <ReactJson
          name={version && version !== 'unknown' ? `webpack@${version}` : `webpack.config`}
          theme="monokai"
          src={selectKeys.length === 0 ? webpack : pick(webpack, selectKeys)}
          displayDataTypes={false}
          displayObjectSize={false}
        />
      </Row>
    </TextDrawer>
  );
};

export const WebpackConfigurationViewer = withServerAPI({
  Component: WebpackConfigurationViewerBase,
  api: SDK.ServerAPI.API.LoadDataByKey,
  responsePropName: 'configs',
  body: {
    key: 'configs',
  },
  showSkeleton: false,
});
