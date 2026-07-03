import Icon from '@ant-design/icons';
import { Alert } from 'antd';

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
    <Alert
      message={
        <>
          <Icon
            className={styles.icon}
            component={theme === 'common' ? FileSvg : TotalSizeSvg}
          />
          <span className={styles.description}>{description}</span>
          <span className={styles.data}>{number}</span>
        </>
      }
      className={styles.container}
      type={theme === 'common' ? 'info' : theme}
    ></Alert>
  );
};
