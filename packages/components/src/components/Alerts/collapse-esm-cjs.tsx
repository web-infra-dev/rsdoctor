import { Collapse, Space, Tag, Typography } from 'antd';

import Overview from '../Overall/overview';
import styles from './collapse.module.scss';
import { beautifyPath } from '../../utils/file';
import { LabelComponent, IdeIcons } from './collapse-shared';

import type { Rule } from '@rsdoctor/types';
import type { AlertProps } from '../Alert/types';

const { Text } = Typography;

export const EsmResolvedToCjsAlertCollapse = (props: {
  data: Array<Rule.RuleStoreDataItem>;
  extraData: Omit<AlertProps, 'data'>;
}) => {
  const { data, extraData } = props;
  const { cwd } = extraData;

  const items = data.map((d) => {
    const item = d as Rule.EsmResolvedToCjsRuleStoreData;
    const { packageName, packageVersion, esmEntry, resolvedModule, issuers } =
      item;

    const resolvedDisplayPath = beautifyPath(resolvedModule.path, cwd);

    const ChildComponent = () => (
      <div className={styles.collapseContainer}>
        <Overview
          style={{ backgroundColor: '#fff' }}
          title={
            <Space align="center" wrap>
              <Text strong style={{ fontSize: 13 }}>
                Package:
              </Text>
              <Tag
                style={{
                  fontFamily: 'Menlo',
                  backgroundColor: '#EAEDF1',
                  borderRadius: '2px',
                }}
              >
                {`${packageName}@${packageVersion}`}
              </Tag>
            </Space>
          }
          description={
            <div className={styles.collapseChild}>
              {/* ESM entry that should have been used */}
              <div
                style={{
                  display: 'flex',
                  marginBottom: 8,
                  alignItems: 'center',
                }}
              >
                <div
                  className={styles.attribute}
                  style={{ color: '#52c41a', minWidth: 100 }}
                >
                  ESM Entry
                </div>
                <div className={styles.iconContainer}>
                  <span className={styles.data}>{esmEntry}</span>
                  <Tag
                    style={{
                      marginLeft: 8,
                      backgroundColor: '#f6ffed',
                      borderColor: '#b7eb8f',
                      color: '#389e0d',
                      borderRadius: '2px',
                      fontSize: 11,
                    }}
                  >
                    declared in package.json
                  </Tag>
                </div>
              </div>

              {/* CJS file that was actually resolved */}
              <div
                style={{
                  display: 'flex',
                  marginBottom: 16,
                  alignItems: 'center',
                }}
              >
                <div
                  className={styles.attribute}
                  style={{ color: '#ff4d4f', minWidth: 100 }}
                >
                  CJS Resolved
                </div>
                <div className={styles.iconContainer}>
                  <span className={styles.data}>{resolvedDisplayPath}</span>
                  <Tag
                    style={{
                      marginLeft: 8,
                      backgroundColor: '#fff1f0',
                      borderColor: '#ffa39e',
                      color: '#cf1322',
                      borderRadius: '2px',
                      fontSize: 11,
                    }}
                  >
                    actually bundled
                  </Tag>
                </div>
              </div>

              {/* Issuers */}
              <div
                style={{
                  marginBottom: 8,
                  fontWeight: 500,
                  color: 'rgba(28, 31, 35, 0.85)',
                }}
              >
                {`ESM Importers (${issuers.length}):`}
              </div>
              {issuers.map((issuer, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    marginBottom: 4,
                    alignItems: 'center',
                  }}
                >
                  <div className={styles.attribute}>import</div>
                  <div className={styles.iconContainer}>
                    <span className={styles.data}>
                      {beautifyPath(issuer.path, cwd)}
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
                      {`'${issuer.request}'`}
                    </Tag>
                    <IdeIcons file={issuer.path} />
                  </div>
                </div>
              ))}
            </div>
          }
        />
      </div>
    );

    return {
      key: `${packageName}::${resolvedModule.path}`,
      label: (
        <LabelComponent
          title={
            <Space size={4} align="center">
              <Tag style={{ backgroundColor: '#EAEDF1', borderRadius: '2px' }}>
                <span
                  className={styles.pkgName}
                >{`${packageName}@${packageVersion}`}</span>
              </Tag>
            </Space>
          }
          description={`has an ESM entry but was resolved to CJS by ${issuers.length} importer(s).`}
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
