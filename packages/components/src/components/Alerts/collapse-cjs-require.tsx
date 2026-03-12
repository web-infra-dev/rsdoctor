import { Collapse, Space, Tag } from 'antd';

import Overview from '../Overall/overview';
import styles from './collapse.module.scss';
import { beautifyPath } from '../../utils/file';
import { LabelComponent, IdeIcons } from './collapse-shared';

import type { Rule } from '@rsdoctor/types';
import type { AlertProps } from '../Alert/types';

const { innerWidth } = window;

export const CjsRequireAlertCollapse = (props: {
  data: Array<Rule.RuleStoreDataItem>;
  extraData: Omit<AlertProps, 'data'>;
}) => {
  const { data, extraData } = props;
  const { cwd } = extraData;

  // Group by required module path
  const groupMap = new Map<
    string,
    {
      requiredPath: string;
      issuers: Array<{ issuerPath: string; request: string }>;
    }
  >();

  for (const d of data) {
    const item = d as Rule.CjsRequireRuleStoreData;
    const key = item.requiredModule.path;
    if (!groupMap.has(key)) {
      groupMap.set(key, { requiredPath: key, issuers: [] });
    }
    groupMap.get(key)!.issuers.push({
      issuerPath: item.issuerModule.path,
      request: item.request,
    });
  }

  const groups = Array.from(groupMap.values());

  const items = groups.map((group) => {
    const requiredDisplayPath = beautifyPath(group.requiredPath, cwd);
    const issuerCount = group.issuers.length;

    const ChildComponent = () => (
      <div className={styles.collapseContainer}>
        <Overview
          style={{ backgroundColor: '#fff' }}
          title={
            <Space align="center">
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'rgba(28, 31, 35, 0.85)',
                }}
              >
                Required Module:
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: 'rgba(28, 31, 35, 0.6)',
                  fontWeight: 300,
                  maxWidth: innerWidth > 1500 ? 900 : 700,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'inline-block',
                }}
              >
                {requiredDisplayPath}
              </span>
            </Space>
          }
          description={
            <div className={styles.collapseChild}>
              <div
                style={{
                  marginBottom: 8,
                  fontWeight: 500,
                  color: 'rgba(28, 31, 35, 0.85)',
                }}
              >
                CJS Require Callers:
              </div>
              {group.issuers.map((issuer, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    marginBottom: 4,
                    alignItems: 'center',
                  }}
                >
                  <div className={styles.attribute}>require</div>
                  <div className={styles.iconContainer}>
                    <span className={styles.data}>
                      {beautifyPath(issuer.issuerPath, cwd)}
                    </span>
                    <Tag
                      style={{
                        marginLeft: 8,
                        backgroundColor: '#EAEDF1',
                        borderRadius: '2px',
                        fontSize: 11,
                        fontFamily: 'Menlo',
                      }}
                    >
                      {`require('${issuer.request}')`}
                    </Tag>
                    <IdeIcons file={issuer.issuerPath} />
                  </div>
                </div>
              ))}
            </div>
          }
        />
      </div>
    );

    return {
      key: requiredDisplayPath,
      label: (
        <LabelComponent
          title={
            <Space size={4} align="center">
              <Tag style={{ backgroundColor: '#EAEDF1', borderRadius: '2px' }}>
                <span className={styles.pkgName}>{requiredDisplayPath}</span>
              </Tag>
            </Space>
          }
          description={`cannot be tree-shaken — required via CJS \`require()\` by ${issuerCount} caller(s).`}
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
