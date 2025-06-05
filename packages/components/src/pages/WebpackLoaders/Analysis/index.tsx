import React from 'react';
import { LoaderAnalysis } from '../../../components/Loader/Analysis';
import { WebpackConfigurationViewer } from '../../../components/Configuration';
import { Card } from '../../../components/Card';
import { Popover, Space, Tag, theme, Typography } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { t } from 'i18next';
const { useToken } = theme;

export const Page: React.FC = () => {
  const { token } = useToken();

  return (
    <Card
      title={
        <Space align="baseline">
          <Typography.Title level={5} style={{ margin: 0 }}>
            Loader Analysis
          </Typography.Title>
          <Popover
            content={
              <div>
                {t('AsyncLoaderInfo')}
                <a
                  href="https://rsdoctor.rs/guide/more/faq#cssextractrspackplugin-%E7%9A%84-loader-%E8%80%97%E6%97%B6%E8%BF%87%E9%95%BF%E9%97%AE%E9%A2%98"
                  target="_blank"
                  rel="noreferrer"
                >
                  详情
                </a>
              </div>
            }
            title="Info"
          >
            <Tag icon={<ExclamationCircleOutlined />} color="warning">
              Info
            </Tag>
          </Popover>
        </Space>
      }
      extra={<WebpackConfigurationViewer defaultKeys={['module', 'resolve']} />}
      bodyStyle={{ paddingTop: token.padding, height: 800 }}
    >
      <LoaderAnalysis />
    </Card>
  );
};

export * from './constants';
