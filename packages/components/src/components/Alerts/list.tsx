import { Button, Empty } from 'antd';

import { Overview } from '../Overall/overview';
import { useRuleIndexNavigate } from '../../utils';

import { Rule } from '@rsdoctor/types';

import styles from './list.module.scss';

export const CommonList = (props: { data: Array<Rule.RuleStoreDataItem> }) => {
  const { data } = props;
  return data.length ? (
    data.map((d) => {
      const { code, link } = d;
      const navigate = useRuleIndexNavigate(code, link);
      return (
        <Overview
          style={{
            background: '#fff',
          }}
          description={
            <span className={styles.description}>{d.description}</span>
          }
          icon={
            <Button onClick={() => navigate} type="link">
              more
            </Button>
          }
        />
      );
    })
  ) : (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
  );
};
