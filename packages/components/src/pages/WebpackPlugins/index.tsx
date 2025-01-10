import { ApiOutlined, PartitionOutlined } from '@ant-design/icons';
import { SDK } from '@rsdoctor/types';
import { Button, Card, Input, Select, Space, Typography } from 'antd';
import React, { useState } from 'react';
import { WebpackConfigurationViewer } from '../../components/Configuration';
import { ServerAPIProvider } from '../../components/Manifest';
import { WebpackPluginsDataTable } from '../../components/Plugins/webpack';
import { Size } from '../../constants';
import './index.scss';

export const Page: React.FC = () => {
  const [selectedTapNames, setSelectedTapNames] = useState([]);
  const [selectedHooks, setSelectedHooks] = useState([]);

  return (
    <div>
      <Card
        title="Webpack Plugins Overall"
        bodyStyle={{ paddingTop: Size.BasePadding / 3 }}
        extra={<WebpackConfigurationViewer defaultKeys={['plugins']} />}
      >
        <Space
          direction="vertical"
          style={{ width: '100%', padding: '0 30px' }}
        >
          <ServerAPIProvider api={SDK.ServerAPI.API.GetPluginSummary}>
            {({ hooks, tapNames }) => (
              <Space style={{ marginBottom: Size.BasePadding / 2 }}>
                <Input.Group compact>
                  <Button>
                    <ApiOutlined />
                    <Typography.Text>Plugin Tap Names</Typography.Text>
                  </Button>
                  <Select
                    mode="multiple"
                    allowClear
                    className="plugin-select"
                    style={{ width: 300 }}
                    popupMatchSelectWidth
                    onChange={(e) => {
                      setSelectedTapNames(e);
                    }}
                  >
                    {tapNames.map((e) => {
                      return (
                        <Select.Option key={e} label={e} value={e}>
                          {e}
                        </Select.Option>
                      );
                    })}
                  </Select>
                </Input.Group>
                <Input.Group compact>
                  <Button>
                    <PartitionOutlined />
                    <Typography.Text>Hooks</Typography.Text>
                  </Button>
                  <Select
                    mode="multiple"
                    allowClear
                    className="plugin-select"
                    style={{ width: 300 }}
                    popupMatchSelectWidth
                    onChange={(e) => {
                      setSelectedHooks(e);
                    }}
                  >
                    {hooks.map((e) => {
                      return (
                        <Select.Option key={e} label={e} value={e}>
                          {e}
                        </Select.Option>
                      );
                    })}
                  </Select>
                </Input.Group>
              </Space>
            )}
          </ServerAPIProvider>
          <ServerAPIProvider
            api={SDK.ServerAPI.API.GetPluginData}
            body={{ hooks: selectedHooks, tapNames: selectedTapNames }}
          >
            {(res) => <WebpackPluginsDataTable dataSource={res} />}
          </ServerAPIProvider>
        </Space>
      </Card>
    </div>
  );
};

export * from './constants';
