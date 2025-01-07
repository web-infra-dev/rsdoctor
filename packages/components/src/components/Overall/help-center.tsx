import { Button } from 'antd';
import { RightOutlined } from '@ant-design/icons';

import { Card } from '../Card';
import { useI18n } from '../../utils';

import styles from './help-center.module.scss';

interface HelpCenterProps {
  data: Array<{
    title: string;
    link: string;
  }>;
}

export const HelpCenter = (props: HelpCenterProps) => {
  const { data } = props;
  const { t } = useI18n();

  return (
    <Card style={{ width: '100%', borderRadius: '12px' }}>
      <div style={{ marginTop: '-4px' }}>
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
          {data.map(({ title, link }) => {
            return (
              <div
                className={styles.content}
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
