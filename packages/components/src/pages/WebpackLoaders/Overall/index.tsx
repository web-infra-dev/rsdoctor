import React from 'react';
import { WebpackConfigurationViewer } from '../../../components/Configuration';
import { Card } from '../../../components/Card';
import { LoaderChart } from 'src/components/Charts';
import { Popover, Space, Tag, Typography } from 'antd/lib';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

export const Page: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Card
      title={
        <Space align="baseline">
          <Typography.Title level={5} style={{ margin: 0 }}>
            Loader Timeline
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
      extra={<WebpackConfigurationViewer defaultKeys={['module']} />}
    >
      <LoaderChart />
    </Card>
  );
};

export * from './constants';
