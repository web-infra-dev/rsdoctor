import Icon from '@ant-design/icons';

import TotalSizeSvg from '../../common/svg/total-size.svg';
import FileSvg from '../../common/svg/file.svg';

import styles from './DataSummary.module.scss';

export interface DataSummaryProps {
  theme: 'common' | 'warning';
  number: string | number;
  onClick?: () => void;
  description: string;
  numberFontSize?: string;
}

export const DataSummary = ({
  theme,
  number,
  description,
}: DataSummaryProps) => {
  return (
    <div className={`${styles.container} ${styles[theme]}`}>
      <Icon
        style={{ fontSize: '18px', margin: '0 5px' }}
        component={theme === 'common' ? FileSvg : TotalSizeSvg}
      />
      <span className={styles.description}>{description}</span>
      <span className={styles.data}>{number}</span>
    </div>
  );
};
