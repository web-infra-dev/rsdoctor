import { Button, Typography } from 'antd';
import Icon from '@ant-design/icons';

import SourceSvg from '../../common/svg/source.svg';
import OutputSvg from '../../common/svg/output.svg';
import ErrorSvg from '../../common/svg/error.svg';
import { useRuleIndexNavigate } from '../../utils';

import { LinkAlertProps } from './types';

import styles from './ecma-version-check.module.scss';

const { Text } = Typography;

export const ECMAVersionCheck: React.FC<LinkAlertProps> = ({ data }) => {
  return data.map((d) => {
    const { code, link, error } = d;
    const { source, output } = error || {};
    const sourceMessage = source?.path
      ? `${source?.path}:${source?.line}:${source?.column}`
      : null;
    const outputMessage = output?.path
      ? `${output?.path}:${output?.line}:${output?.column}`
      : `There's no source map for this error.Possible reasons are as follows:
       1. It might come from a third-party library without source map.
       2. If this is your business source code, source map should be enabled in your build config.
      `;

    console.log(d, 'ddddddddddd');
    const navigate = useRuleIndexNavigate(code, link);
    return (
      <div className={styles.container}>
        <div>
          <div className={styles.title}>Source</div>
          <div className={styles.box}>
            <Icon component={SourceSvg} />
            <Text
              ellipsis={{ tooltip: sourceMessage }}
              className={styles.content}
            >
              {sourceMessage}
            </Text>
          </div>
        </div>
        <div>
          <div className={styles.title}>Output</div>
          <div className={styles.box}>
            <Icon component={OutputSvg} />
            <Text
              ellipsis={{ tooltip: outputMessage }}
              className={styles.content}
            >
              {outputMessage}
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
