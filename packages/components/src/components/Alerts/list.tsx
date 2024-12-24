import { Button } from 'antd';

import { Overview } from '../Overall/overview';
import { useRuleIndexNavigate } from '../../utils';

import { Rule } from '@rsdoctor/types';

import styles from './list.module.scss';

export const CommonList = (props: { data: Array<Rule.RuleStoreDataItem> }) => {
  const { data } = props;
  return data.map((d) => {
    const { code, link, description } = d;
    const navigate = useRuleIndexNavigate(code, link);

    return (
      <Overview
        style={{
          background: '#fff',
        }}
        description={<span className={styles.description}>{description}</span>}
        icon={
          <Button onClick={() => navigate} type="link">
            more
          </Button>
        }
      />
    );
  });
};
