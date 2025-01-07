import { Descriptions, DescriptionsProps, Avatar } from 'antd';
import {
  CloseCircleFilled,
  WarningFilled,
  FileFilled,
  ExperimentFilled,
} from '@ant-design/icons';
import { filter } from 'lodash-es';

import { ServerAPIProvider } from '../Manifest';
import { useI18n, formatSize } from '../../utils';
import { WebpackConfigurationViewer } from '../Configuration';
import { Card } from '../Card';
import { Overview } from './overview';
import styles from './project.module.scss';

import listStyles from './list.module.scss';
import cardStyles from './card.module.scss';
import projectStyles from './project.module.scss';

import { SDK } from '@rsdoctor/types';

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
    <ServerAPIProvider
      api={SDK.ServerAPI.API.GetAssetsSummary}
      body={{ withFileContent: false }}
    >
      {(res) => {
        const totalSizeStr = formatSize(res.all.total.size);
        const totalFiles = res.all.total.count;
        const [size, unit] = totalSizeStr.split(' ');
        const overViewData = [
          {
            title: 'Errors',
            description: <span style={{ color: '#FF4D4F' }}>{errors}</span>,
            icon: (
              <Avatar
                style={{ background: '#FF4D4F' }}
                shape="circle"
                icon={<CloseCircleFilled style={{ fontSize: '18px' }} />}
              />
            ),
          },
          {
            title: 'Warnings',
            description: <span style={{ color: '#FAAD14' }}>{warns}</span>,
            icon: (
              <Avatar
                style={{ background: '#FAAD14' }}
                shape="circle"
                icon={<WarningFilled style={{ fontSize: '18px' }} />}
              />
            ),
          },
          {
            title: 'Total Files',
            description: <span>{totalFiles}</span>,
            icon: (
              <Avatar
                style={{ background: '#3874F6' }}
                shape="circle"
                icon={<FileFilled style={{ fontSize: '18px' }} />}
              />
            ),
          },
          {
            title: 'Total Size',
            description: (
              <>
                <span style={{ fontSize: '20px' }}>{size}</span>
                <span style={{ fontSize: '13px', marginLeft: '5px' }}>
                  {unit}
                </span>
              </>
            ),
            icon: (
              <Avatar
                style={{ background: '#FF4D4F' }}
                shape="circle"
                icon={<ExperimentFilled style={{ fontSize: '18px' }} />}
              />
            ),
          },
        ];

        return (
          <Card className={cardStyles.card}>
            <div style={{ marginTop: '-4px' }}>
              <div className={styles.title}>
                <span className={styles.left}>{t('Project Overall')}</span>
                <WebpackConfigurationViewer />
              </div>
              <div className={projectStyles.overview}>
                {overViewData.map((data, idx) => (
                  <Overview
                    key={idx}
                    title={data.title}
                    description={<span>{data.description}</span>}
                    icon={data.icon}
                  />
                ))}
              </div>
              <Descriptions
                className={listStyles.projectOverall}
                items={items}
              />
            </div>
          </Card>
        );
      }}
    </ServerAPIProvider>
  );
};
