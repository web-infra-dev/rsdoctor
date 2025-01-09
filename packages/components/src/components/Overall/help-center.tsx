import { Button } from 'antd';
import { RightOutlined } from '@ant-design/icons';

import { Card } from '../Card';
import { useI18n } from '../../utils';

import styles from './help-center.module.scss';

const data = [
  {
    title: 'FAQ',
    link: 'https://rsdoctor.dev/guide/more/faq',
  },
  {
    title: 'Introduction',
    link: 'https://rsdoctor.dev/guide/start/intro',
  },
  {
    title: 'Bundle Alerts',
    link: 'https://rsdoctor.dev/guide/usage/bundle-alerts',
  },
  {
    title: 'Bundle Overall',
    link: 'https://rsdoctor.dev/guide/usage/bundle-overall',
  },
  {
    title: 'Bundle Analysis',
    link: 'https://rsdoctor.dev/guide/usage/bundle-size',
  },
  {
    title: 'Compilation Alerts',
    link: 'https://rsdoctor.dev/guide/usage/compile-alerts',
  },
  {
    title: 'Compile Overall',
    link: 'https://rsdoctor.dev/guide/usage/compile-overall',
  },
  {
    title: 'Loaders Analysis',
    link: 'https://rsdoctor.dev/guide/usage/loaders-analysis',
  },
  {
    title: 'Loaders Timeline',
    link: 'https://rsdoctor.dev/guide/usage/loaders-timeline',
  },
  {
    title: 'Plugin Analysis',
    link: 'https://rsdoctor.dev/guide/usage/plugins-analysis',
  },
];

export const HelpCenter = () => {
  const { t } = useI18n();

  return (
    <Card style={{ width: '100%', borderRadius: '12px' }}>
      <div>
        <div className={styles.title}>
          <span>{t('Help Center')}</span>
          <Button
            style={{ display: 'flex', alignItems: 'center', padding: 0 }}
            type="link"
            onClick={() => {
              window.open('https://rsdoctor.dev/index', '_blank');
            }}
          >
            <span style={{ marginRight: '3px' }}>More</span>
            <RightOutlined style={{ fontSize: '10px' }} />
          </Button>
        </div>
        <div className={styles.container}>
          {data.map(({ title, link }, idx) => {
            return (
              <div
                className={styles.content}
                style={{
                  marginBottom: idx < data.length - 2 ? '16px' : 0,
                }}
                onClick={() => window.open(link, '_blank')}
              >
                {t(title)}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
