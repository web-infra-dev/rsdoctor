import { Button } from 'antd';
import Icon from '@ant-design/icons';

import SourceSvg from '../../common/svg/source.svg';
import OutputSvg from '../../common/svg/output.svg';
import ErrorSvg from '../../common/svg/error.svg';
import { useRuleIndexNavigate } from '../../utils';

import { LinkAlertProps } from './types';

import styles from './ecma-version-check.module.scss';

export const LinkRuleAlert: React.FC<LinkAlertProps> = ({ data }) => {
  return data.map((d) => {
    const { code, link } = d;
    const navigate = useRuleIndexNavigate(code, link);
    return (
      <div className={styles.container}>
        <div>
          <div className={styles.title}>Source</div>
          <div>
            <Icon component={SourceSvg} />
            <span className={styles.content}>Source</span>
          </div>
        </div>
        <div>
          <div className={styles.title}>Output</div>
          <div>
            <Icon component={OutputSvg} />
            <span className={styles.content}>Source</span>
          </div>
        </div>
        <div>
          <div className={styles.title}>Error</div>
          <div>
            <Icon component={ErrorSvg} />
            <span className={styles.content}>{d.description}</span>
          </div>
        </div>
        <Button onClick={navigate} type="link">
          more
        </Button>
      </div>
    );
  });
};
