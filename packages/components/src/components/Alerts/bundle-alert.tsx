import { Typography, Tabs } from 'antd';
import { Rule } from '@rsdoctor/types';

import { Card } from '../Card';
import { LinkRuleAlert } from '../Alert/ecma-version-check';
import { Overview } from '../Overall/overview';
import { AlertCollapse } from './collapse';
import { CommonList } from './list';
import { ViewMode } from '../../constants';

import { AlertProps } from '../Alert/types';

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
        key={td.key}
        title={td.label}
        description={td.data.length}
        icon={<Typography.Text code>{td.key}</Typography.Text>}
      />
    );

    let children;
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
        children = <LinkRuleAlert data={td.data} />;
        break;
      default:
        children = null;
        break;
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