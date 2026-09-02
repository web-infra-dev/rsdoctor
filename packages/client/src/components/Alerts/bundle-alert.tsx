import { Tabs, Empty, Tag } from 'antd';
import { useState } from 'react';

import { Card } from '../Card';
import { ECMAVersionCheck } from '../Alert/ecma-version-check';
import { Overview } from '../Overall/overview';
import { AlertCollapse } from './collapse';
import { CommonList } from './list';
import { ViewMode } from '../../constants';

import { AlertProps } from '../Alert/types';

import type { Rule } from '@rsdoctor/shared/types';
import type { CSSProperties } from 'react';

import styles from './bundle-alert.module.scss';
import utilStyles from './index.module.scss';
import { CrossChunksAlertCollapse } from './collapse-cross-chunks';
import { ModuleMixedChunksAlertCollapse } from './collapse-module-mixed-chunks';
import { SideEffectsOnlyImportsAlertCollapse } from './collapse-side-effects-only-imports';
import { CjsRequireAlertCollapse } from './collapse-cjs-require';
import { EsmResolvedToCjsAlertCollapse } from './collapse-esm-cjs';
import { groupBundleAlerts } from './bundle-alert-data';
import { useHorizontalTabScroll } from './useHorizontalTabScroll';

interface BundleAlertProps {
  title: string;
  cwd: string;
  dataSource: Rule.RuleStoreDataItem[];
  extraData: Omit<AlertProps, 'data'>;
  viewMode: ViewMode;
  setViewMode(mode: ViewMode): void;
  extraCom?: React.JSX.Element | undefined;
}

export const BundleAlert: React.FC<BundleAlertProps> = ({
  title,
  dataSource,
  extraData,
}) => {
  const horizontalTabScrollHandlers = useHorizontalTabScroll();
  const tabData = groupBundleAlerts(dataSource);

  tabData.sort(
    (a, b) => (b.data.length > 0 ? 1 : 0) - (a.data.length > 0 ? 1 : 0),
  );
  const hasRuleAlerts = tabData.some(({ data }) => data.length > 0);

  const defaultActiveKey = tabData[0]?.key ?? 'E1001';
  const [activeKey, setActiveKey] = useState(defaultActiveKey);
  const resolvedActiveKey = tabData.some((tab) => tab.key === activeKey)
    ? activeKey
    : defaultActiveKey;

  const tabItems = tabData.map((td) => {
    const tagStyle =
      resolvedActiveKey === td.key
        ? ({
            border: '1px solid #91D5FF',
            backgroundColor: '#E6F7FF',
          } as CSSProperties)
        : {};

    const tagTextStyle =
      resolvedActiveKey === td.key
        ? {
            color: '#1890FF',
          }
        : {};

    const LabelComponent = () => (
      <Overview
        style={{
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: 0,
          minHeight: 'auto',
          padding: '8px 0',
          width: '100%',
        }}
        title={<span className={styles.labelTitle}>{td.label}</span>}
        description={
          <div className={styles.labelDescription}>
            <span>{td.data.length}</span>
            <Tag
              style={{ fontFamily: 'Menlo', borderRadius: '2px', ...tagStyle }}
            >
              <span style={{ ...tagTextStyle }}>{td.tag}</span>
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
        children = (
          <CrossChunksAlertCollapse data={td.data} extraData={extraData} />
        );
        break;
      case 'E1003':
        children = <CommonList data={td.data} />;
        break;
      case 'E1004':
        description = (
          <span>
            No ECMA Version Check Rules were found. Please refer to
            「https://rsdoctor.rs/guide/usage/rule-config」.
          </span>
        );
        children = <ECMAVersionCheck data={td.data} />;
        break;
      case 'E1005':
        children = <CommonList data={td.data} />;
        break;
      case 'E1006':
        children = (
          <ModuleMixedChunksAlertCollapse
            data={td.data}
            extraData={extraData}
          />
        );
        break;
      case 'E1007':
        children = (
          <SideEffectsOnlyImportsAlertCollapse
            data={td.data}
            extraData={extraData}
          />
        );
        break;
      case 'E1008':
        children = (
          <CjsRequireAlertCollapse data={td.data} extraData={extraData} />
        );
        break;
      case 'E1009':
        children = (
          <EsmResolvedToCjsAlertCollapse data={td.data} extraData={extraData} />
        );
        break;
      case 'CUSTOM_RULES':
        children = <CommonList data={td.data} showCode />;
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
                className={utilStyles.tag}
                style={{
                  fontFamily: 'Menlo',
                  fontWeight: '700',
                  fontSize: '13px',
                }}
              >
                {td.tag}
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
      <div className={styles.container} {...horizontalTabScrollHandlers}>
        <div className={styles.title}>{title}</div>
        {!hasRuleAlerts ? (
          <div
            style={{
              minHeight: '480px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Empty
              description={'No Bundle Alerts Data'}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : (
          <Tabs
            onChange={setActiveKey}
            tabBarGutter={10}
            type="card"
            activeKey={resolvedActiveKey}
            items={tabItems}
          />
        )}
      </div>
    </Card>
  );
};
