import Icon from '@ant-design/icons';
import { Collapse, Space, Tag, Typography } from 'antd';

import Overview from '../Overall/overview';
import styles from './collapse.module.scss';
import TotalSizeSvg from '../../common/svg/total-size.svg';
import { beautifyPath } from '../../utils/file';
import { LabelComponent, IdeIcons } from './collapse-shared';

import type { Rule } from '@rsdoctor/types';
import type { AlertProps } from '../Alert/types';

const { Text } = Typography;
const { innerWidth } = window;

export const SideEffectsOnlyImportsAlertCollapse = (props: {
  data: Array<Rule.RuleStoreDataItem>;
  extraData: Omit<AlertProps, 'data'>;
}) => {
  const { data, extraData } = props;
  const { cwd } = extraData;

  const items = data.map((d) => {
    const { module, connections } =
      d as Rule.ConnectionsOnlyImportsRuleStoreData;

    const modulePath = beautifyPath(module.path, cwd);

    const ChildComponent = () => {
      return (
        <div className={styles.collapseContainer}>
          <Overview
            style={{ backgroundColor: '#fff' }}
            title={
              <Space align="center">
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
                <IdeIcons file={module.path} />
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
                  Side-Effects-Only Importers:
                </div>
                {connections.map((conn, idx) => (
                  <div key={idx} style={{ display: 'flex', marginBottom: 4 }}>
                    <div className={styles.attribute}>Import</div>
                    <div className={styles.iconContainer}>
                      <span className={styles.data}>{conn.userRequest}</span>
                      <Tag
                        style={{
                          marginLeft: 8,
                          backgroundColor: '#EAEDF1',
                          borderRadius: '2px',
                          fontSize: 11,
                        }}
                      >
                        {conn.dependencyType}
                      </Tag>
                    </div>
                  </div>
                ))}
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
            <Space size={4} align="center">
              <Tag style={{ backgroundColor: '#EAEDF1', borderRadius: '2px' }}>
                <span className={styles.pkgName}>{modulePath}</span>
              </Tag>
            </Space>
          }
          description={`is only imported for its side effects by ${new Set(connections.map((c) => c.originModule)).size} importer(s).`}
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
