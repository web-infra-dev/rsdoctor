import { Typography, Tabs, Empty } from 'antd';

import { Card } from '../Card';
import { ECMAVersionCheck } from '../Alert/ecma-version-check';
import { Overview } from '../Overall/overview';
import { AlertCollapse } from './collapse';
import { CommonList } from './list';
import { ViewMode } from '../../constants';

import { AlertProps } from '../Alert/types';

import type { Rule } from '@rsdoctor/types';

import styles from './bundle-alert.module.scss';

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
  if (!dataSource.length) return null;

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
    const LabelComponent = () => (
      <Overview
        title={td.label}
        description={td.data.length}
        icon={<Typography.Text code>{td.key}</Typography.Text>}
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
        <Card className={styles.card} type="inner" title={td.label}>
          {children}
        </Card>
      ),
    };
  });

  return (
    <Card title={title}>
      <Tabs defaultActiveKey="E1001" items={tabItems} />
    </Card>
  );
};
