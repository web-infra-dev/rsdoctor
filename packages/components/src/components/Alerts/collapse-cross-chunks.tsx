import Icon from '@ant-design/icons';
import { Collapse, Space, Tag, Typography } from 'antd';
import { ReactNode } from 'react';

import Overview from '../Overall/overview';
import styles from './collapse.module.scss';
import TotalSizeSvg from '../../common/svg/total-size.svg';

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

export const CrossChunksAlertCollapse = (props: {
  data: Array<Rule.RuleStoreDataItem>;
  extraData: Omit<AlertProps, 'data'>;
}) => {
  const { data } = props;
  console.log(data);
  const items = data.map((d) => {
    const { package: dupPackage, chunks } =
      d as Rule.CrossChunksPackageRuleStoreData;

    const ChildComponent = () => {
      return chunks.map(({ chunks, module }) => {
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
                      {module.path}
                    </Text>
                  </Text>
                </Space>
              }
              description={
                <div className={styles.collapseChild}>
                  {chunks.map((chunk) => (
                    <div style={{ display: 'flex' }}>
                      <div className={styles.attribute}>Chunk</div>
                      <div className={styles.iconContainer}>
                        <span className={styles.data}>{chunk.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              }
            />
          </div>
        );
      });
    };

    return {
      key: d.code,
      label: (
        <LabelComponent
          title={
            <Tag style={{ backgroundColor: '#EAEDF1', borderRadius: '2px' }}>
              <span
                className={styles.pkgName}
              >{`${dupPackage.name}@${dupPackage.version}`}</span>
            </Tag>
          }
          description={`has duplicates bundled into multiple chunks.`}
        />
      ),
      children: <ChildComponent />,
    };
  });

  return (
    <Collapse
      style={{ width: '100%' }}
      defaultActiveKey={['E1005']}
      items={items}
    />
  );
};
