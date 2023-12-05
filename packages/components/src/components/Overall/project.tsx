import { Space, Row, Col, Descriptions, DescriptionsProps } from 'antd';
import React from 'react';
import { filter } from 'lodash-es';
import { SDK } from '@rsdoctor/types';
import { useI18n } from '../../utils';
import { WebpackConfigurationViewer } from '../Configuration';
import { Card } from '../Card';

import listStyles from './list.module.scss';
import cardStyles from './card.module.scss';
import numberButtonStyles from './NumberButton.module.scss';
import { TextDrawer } from '../TextDrawer';
import { BundleAlerts, CompileAlerts, OverlayAlertsWithTips } from '../Alerts';
import { NumberButton } from './NumberButton';

export const ProjectOverall: React.FC<{
  configs: SDK.ConfigData;
  cwd: string;
  envinfo: SDK.EnvInfo;
  alerts: SDK.ErrorsData;
}> = ({ configs = [], cwd, envinfo, alerts = [] }) => {
  const { t } = useI18n();

  const warns = filter(alerts, (e) => e.level === 'warn').length;

  const errors = alerts.length - warns;

  const items: DescriptionsProps['items'] = [
    ...Object.keys(envinfo).map((key) => {
      const regexp = /Version$/;
      const isVersion = regexp.test(key);
      return {
        key,
        label: isVersion ? key.replace(regexp, '') : key,
        children: envinfo ? envinfo[key] : undefined,
      };
    }),
    ...configs
      .filter((item) => !!item.version)
      .map((config) => {
        const { name, version } = config;
        return {
          key: name,
          label: name,
          children: version,
        };
      }),
    {
      key: 'cwd',
      label: 'cwd',
      children: cwd,
    },
  ];

  return (
    <Card title={t('Project Overall')} extra={<WebpackConfigurationViewer />} className={cardStyles.card}>
      <Row gutter={16}>
        <Col span={12} className={numberButtonStyles.container}>
          <TextDrawer
            button={<NumberButton theme={errors === 0 ? 'success' : 'error'} number={errors} description="Errors" />}
            drawerProps={{ title: 'Errors List' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <OverlayAlertsWithTips defaultOpen={false} />
              <BundleAlerts filter={(r) => r.level === 'error'} />
              <CompileAlerts filter={(r) => r.level === 'error'} />
            </Space>
          </TextDrawer>
        </Col>
        <Col span={12} className={numberButtonStyles.container}>
          <TextDrawer
            button={<NumberButton theme={warns === 0 ? 'success' : 'warning'} number={warns} description="Warnings" />}
            drawerProps={{ title: 'Warnings List' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <OverlayAlertsWithTips defaultOpen={false} />
              <BundleAlerts filter={(r) => r.level === 'warn'} />
              <CompileAlerts filter={(r) => r.level === 'warn'} />
            </Space>
          </TextDrawer>
        </Col>
      </Row>
      <Descriptions className={listStyles.root} items={items} size="small" column={1} />
    </Card>
  );
};
