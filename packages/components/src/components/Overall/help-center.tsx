import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';

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
  const navigate = useNavigate();

  return (
    <Card
      style={{ width: '100%' }}
      title={
        <div className={styles.title}>
          <span>{t('Help Center')}</span>
          <Button type="link" onClick={() => {}}>
            More
          </Button>
        </div>
      }
    >
      <div className={styles.container}>
        {data.map(({ title, link }) => {
          return (
            <div className={styles.content} onClick={() => navigate(link)}>
              {title}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
