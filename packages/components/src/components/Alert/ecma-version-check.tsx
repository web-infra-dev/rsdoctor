import { Button, Typography } from 'antd';
import Icon from '@ant-design/icons';

import SourceSvg from '../../common/svg/source.svg';
import OutputSvg from '../../common/svg/output.svg';
import ErrorSvg from '../../common/svg/error.svg';
import { useRuleIndexNavigate } from '../../utils';

import { LinkAlertProps } from './types';

import styles from './ecma-version-check.module.scss';

const { Text } = Typography;

export const LinkRuleAlert: React.FC<LinkAlertProps> = ({ data }) => {
  return data.map((d) => {
    const { code, link } = d;
    const navigate = useRuleIndexNavigate(code, link);
    return (
      <div className={styles.container}>
        <div>
          <div className={styles.title}>Source</div>
          <div className={styles.box}>
            <Icon component={SourceSvg} />
            <Text
              ellipsis={{ tooltip: 'source placeholder' }}
              className={styles.content}
            >
              source placeholder
            </Text>
          </div>
        </div>
        <div>
          <div className={styles.title}>Output</div>
          <div className={styles.box}>
            <Icon component={OutputSvg} />
            <Text
              ellipsis={{ tooltip: 'output placeholder' }}
              className={styles.content}
            >
              output placeholder
            </Text>
          </div>
        </div>
        <div>
          <div className={styles.title}>Error</div>
          <div className={styles.box}>
            <Icon component={ErrorSvg} />
            <Text
              ellipsis={{ tooltip: d.description }}
              className={styles.content}
            >
              {d.description}
            </Text>
          </div>
        </div>
        <Button onClick={navigate} type="link">
          more
        </Button>
      </div>
    );
  });
};
