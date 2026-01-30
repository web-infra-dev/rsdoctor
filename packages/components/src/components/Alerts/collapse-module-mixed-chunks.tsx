import Icon from '@ant-design/icons';
import { Collapse, Space, Tag, Typography } from 'antd';
import { ReactNode } from 'react';

import Overview from '../Overall/overview';
import styles from './collapse.module.scss';
import TotalSizeSvg from '../../common/svg/total-size.svg';
import { beautifyPath } from '../../utils/file';

import type { Rule } from '@rsdoctor/types';
import type { AlertProps } from '../Alert/types';

const { Text } = Typography;
const { innerWidth } = window;

const LabelComponent = (props: {
  title: string | ReactNode;
  description: string;
  extra?: ReactNode;
}) => {
  const { title, description, extra } = props;
  return (
    <div className={styles.label}>
      <div className={styles.labelContent}>
        <div>{title}</div>
        <div>{description}</div>
      </div>
      <div>{extra}</div>
    </div>
  );
};

export const ModuleMixedChunksAlertCollapse = (props: {
  data: Array<Rule.RuleStoreDataItem>;
  extraData: Omit<AlertProps, 'data'>;
}) => {
  const { data, extraData } = props;
  const { cwd } = extraData;

  const items = data.map((d) => {
    const { module, initialChunks, asyncChunks } =
      d as Rule.ModuleMixedChunksRuleStoreData;

    const modulePath = beautifyPath(module.path, cwd);

    const ChildComponent = () => {
      return (
        <div className={styles.collapseContainer}>
          <Overview
            style={{ backgroundColor: '#fff' }}
            title={
              <Space>
                <Icon style={{ fontSize: '18px' }} component={TotalSizeSvg} />
                <Text style={{ width: innerWidth > 1500 ? 900 : 700 }}>
                  Module:{' '}
                  <Text
                    style={{
                      fontSize: 12,
                      color: 'rgba(28, 31, 35, 0.6)',
                      fontWeight: 300,
                    }}
                  >
                    {modulePath}
                  </Text>
                </Text>
              </Space>
            }
            description={
              <div className={styles.collapseChild}>
                {initialChunks.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        marginBottom: 8,
                        fontWeight: 500,
                        color: 'rgba(28, 31, 35, 0.85)',
                      }}
                    >
                      Initial Chunks:
                    </div>
                    {initialChunks.map((chunk) => (
                      <div
                        key={chunk.id}
                        style={{ display: 'flex', marginBottom: 4 }}
                      >
                        <div className={styles.attribute}>Chunk</div>
                        <div className={styles.iconContainer}>
                          <span className={styles.data}>
                            {chunk.name || `chunk-${chunk.id}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {asyncChunks.length > 0 && (
                  <div>
                    <div
                      style={{
                        marginBottom: 8,
                        fontWeight: 500,
                        color: 'rgba(28, 31, 35, 0.85)',
                      }}
                    >
                      Async Chunks:
                    </div>
                    {asyncChunks.map((chunk) => (
                      <div
                        key={chunk.id}
                        style={{ display: 'flex', marginBottom: 4 }}
                      >
                        <div className={styles.attribute}>Chunk</div>
                        <div className={styles.iconContainer}>
                          <span className={styles.data}>
                            {chunk.name ||
                              `(no chunk name, ChunkId: ${chunk.id})`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            }
          />
        </div>
      );
    };

    return {
      key: modulePath,
      label: (
        <LabelComponent
          title={
            <Tag style={{ backgroundColor: '#EAEDF1', borderRadius: '2px' }}>
              <span className={styles.pkgName}>{modulePath}</span>
            </Tag>
          }
          description={`is included in both initial and async chunks.`}
        />
      ),
      children: <ChildComponent />,
    };
  });

  return (
    <Collapse
      style={{ width: '100%' }}
      defaultActiveKey={items.map((item) => item.key)}
      items={items}
    />
  );
};
