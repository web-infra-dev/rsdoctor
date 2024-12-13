import { Overview } from '../Overall/overview';

import { Rule } from '@rsdoctor/types';

import styles from './list.module.scss';

const data = [
  'Racing car sprays burning fuel into crowd.',
  'Japanese princess to wed commoner.',
  'Australian walks 100km after outback crash.',
  'Man charged over missing wedding girl.',
  'Los Angeles battles huge wildfires.',
];

export const CommonList = (props: { data: Array<Rule.RuleStoreDataItem> }) => {
  const { data } = props;
  return (
    <Overview
      style={{
        background: '#fff',
      }}
      description={<span className={styles.description}>aaa</span>}
      icon={<span>more</span>}
    />
  );
};
