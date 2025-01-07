import { Tabs, Empty, Tag } from 'antd';

import { Card } from '../Card';
import { ECMAVersionCheck } from '../Alert/ecma-version-check';
import { Overview } from '../Overall/overview';
import { AlertCollapse } from './collapse';
import { CommonList } from './list';
import { ViewMode } from '../../constants';

import { AlertProps } from '../Alert/types';

import type { Rule } from '@rsdoctor/types';

import styles from './bundle-alert.module.scss';
import { CSSProperties, useState } from 'react';

interface BundleAlertProps {
  title: string;
  cwd: string;
  dataSource: Rule.RuleStoreDataItem[];
  extraData: Omit<AlertProps, 'data'>;
  viewMode: ViewMode;
  setViewMode(mode: ViewMode): void;
  extraCom?: JSX.Element | undefined;
}

export const BundleAlert: React.FC<BundleAlertProps> = ({
  title,
  dataSource,
  extraData,
}) => {
  const [activekey, setActiveKey] = useState('E1001');
  const tabData: Array<{
    key: string;
    label: string;
    data: Array<Rule.RuleStoreDataItem>;
  }> = [
    {
      key: 'E1001',
      label: 'Duplicate Packages',
      data: [],
    },
    {
      key: 'E1002',
      label: 'Default Import Check',
      data: [],
    },
    {
      key: 'E1003',
      label: 'Loader Performance Optimization',
      data: [],
    },
    {
      key: 'E1004',
      label: 'ECMA Version Check',
      data: [],
    },
  ];

  dataSource.forEach((data) => {
    const target = tabData.find((td) => td.key === data.code)?.data;
    target?.push(data);
  });

  const tabItems = tabData.map((td) => {
    const tagStyle =
      activekey === td.key
        ? ({
            border: '1px solid #91D5FF',
            backgroundColor: '#E6F7FF',
          } as CSSProperties)
        : {};

    const tagTextStyle =
      activekey === td.key
        ? {
            color: '#1890FF',
          }
        : {};

    const LabelComponent = () => (
      <Overview
        style={{
          backgroundColor: 'transparent',
          paddingLeft: 0,
          paddingRight: 0,
          width: '100%',
        }}
        title={<span className={styles.labelTitle}>{td.label}</span>}
        description={
          <div className={styles.labelDescription}>
            <span>{td.data.length}</span>
            <Tag
              style={{ fontFamily: 'Menlo', borderRadius: '2px', ...tagStyle }}
            >
              <span style={{ ...tagTextStyle }}>{td.key}</span>
            </Tag>
          </div>
        }
      />
    );

    let children, description;
    switch (td.key) {
      case 'E1001':
        children = <AlertCollapse data={td.data} extraData={extraData} />;
        break;
      case 'E1002':
        children = <CommonList data={td.data} />;
        break;
      case 'E1003':
        children = <CommonList data={td.data} />;
        break;
      case 'E1004':
        description = (
          <span>
            No ECMA Version Check Rules were found. Please refer to
            「https://rsdoctor.dev/guide/usage/rule-config」.
          </span>
        );
        children = <ECMAVersionCheck data={td.data} />;
        break;
      default:
        children = null;
        break;
    }

    if (!td.data.length) {
      children = (
        <Empty description={description} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      );
    }

    return {
      key: td.key,
      label: <LabelComponent />,
      children: (
        <Card
          className={styles.card}
          type="inner"
          title={
            <>
              <Tag
                style={{
                  fontFamily: 'Menlo',
                  fontWeight: '700',
                  fontSize: '13px',
                  backgroundColor: '#EAEDF1',
                  borderRadius: '2px',
                }}
              >
                {td.key}
              </Tag>
              <span>{td.label}</span>
            </>
          }
        >
          {children}
        </Card>
      ),
    };
  });

  return (
    <Card style={{ width: '100%', borderRadius: '12px' }}>
      <div style={{ marginTop: '-4px' }}>
        <div className={styles.title}>{title}</div>
        {!dataSource.length ? (
          <Empty
            description={'No Bundle Alerts Data'}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Tabs
            onChange={setActiveKey}
            tabBarGutter={10}
            type="card"
            defaultActiveKey="E1001"
            items={tabItems}
          />
        )}
      </div>
    </Card>
  );
};
