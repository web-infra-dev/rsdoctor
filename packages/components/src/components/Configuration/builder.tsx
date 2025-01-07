import { SDK } from '@rsdoctor/types';
import { Divider, Row, Select, Space, Typography } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import { pick } from 'lodash-es';
import React, { useState } from 'react';
import ReactJson from 'react-json-view';
import { useWebpackConfigurationByConfigs } from '../../utils';
import { withServerAPI } from '../Manifest';
import { TextDrawer } from '../TextDrawer';
import { Title } from '../Title';

import styles from './builder.module.scss';

interface WebpackConfigurationViewerBaseProps {
  defaultKeys?: string[];
  configs: SDK.ConfigData;
}

export const WebpackConfigurationViewerBase: React.FC<
  WebpackConfigurationViewerBaseProps
> = ({ defaultKeys, configs }) => {
  const builderConfigData = useWebpackConfigurationByConfigs(configs || []);

  if (!builderConfigData) return null;

  const { config, version, name } = builderConfigData;
  const keys = Object.keys(config);
  const [selectKeys, setSelectKeys] = useState<string[]>(defaultKeys || keys);

  return (
    <TextDrawer
      text={
        <div className={styles.title}>
          <span style={{ marginRight: '8px', fontSize: '13px' }}>
            View Bundler Config
          </span>
          <RightOutlined style={{ fontSize: '10px' }} />
        </div>
      }
    >
      <Row>
        <Title text={`Bundler Config Viewer`} />
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
          name={
            version && version !== 'unknown'
              ? `${name}@${version}`
              : `webpack.config`
          }
          theme="monokai"
          src={selectKeys.length === 0 ? config : pick(config, selectKeys)}
          displayDataTypes={false}
          displayObjectSize={false}
          style={{ width: '100%' }}
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
