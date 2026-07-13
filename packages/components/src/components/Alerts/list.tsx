import { Button } from 'antd';

import { Overview } from '../Overall/overview';
import { useRuleIndexNavigate } from '../../utils';

import type { Rule } from '@rsdoctor/types';

import styles from './list.module.scss';

export const CommonList = (props: {
  data: Array<Rule.RuleStoreDataItem>;
  showCode?: boolean;
}) => {
  const { data, showCode } = props;
  return data.map((d) => {
    const { code, link, description } = d;
    const navigate = useRuleIndexNavigate(code, link);

    return (
      <Overview
        description={
          <div className={styles.description}>
            {showCode ? <div className={styles.code}>{code}</div> : null}
            <div>{description || ''}</div>
          </div>
        }
        icon={
          <Button onClick={navigate} type="link">
            more
          </Button>
        }
      />
    );
  });
};
