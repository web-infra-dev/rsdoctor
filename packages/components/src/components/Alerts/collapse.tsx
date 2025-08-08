import { ReactNode } from 'react';
import { Collapse, Typography, Divider, Space, Tabs, Tag, Tooltip } from 'antd';
import Icon from '@ant-design/icons';
import { sumBy } from 'lodash-es';

import Overview from '../Overall/overview';
import { TextDrawer } from '../TextDrawer';
import { Title } from '../Title';
import { Size } from '../../constants';
import { formatSize } from '../../utils';
import BundleSizeSvg from '../../common/svg/bundle-size.svg';
import SourceSizeSvg from '../../common/svg/source-size.svg';
import TotalSizeSvg from '../../common/svg/total-size.svg';
import VersionSvg from '../../common/svg/version.svg';

import type { Rule } from '@rsdoctor/types';

import type { AlertProps } from '../Alert/types';

import styles from './collapse.module.scss';

const { Paragraph, Text } = Typography;
const { innerWidth } = window;

const LabelComponent = (props: {
  title: string | ReactNode;
  description: string;
  extra: ReactNode;
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

export const AlertCollapse = (props: {
  data: Array<Rule.RuleStoreDataItem>;
  extraData: Omit<AlertProps, 'data'>;
}) => {
  const { data, extraData } = props;

  const items = data
    .map((d) => {
      const data = d as Rule.PackageRelationDiffRuleStoreData;
      const { packages } = data;
      const totalSize = sumBy(packages, (e) => e.targetSize.sourceSize);

      return {
        totalSize,
        data,
      };
    })
    .sort((a, b) => {
      return b.totalSize - a.totalSize;
    })
    .map(({ data, totalSize }) => {
      const { packages } = data;
      const totalSizeStr = formatSize(totalSize);
      const { name } = packages.find((e) => !!e.target.name)!.target;
      const versions = packages.map((item) => item.target.version);

      const ChildComponent = () => {
        return packages.map((pkg, idx) => {
          const version = pkg.target.version;
          const root = pkg.target.root;
          const sizeStr = formatSize(pkg.targetSize.sourceSize);
          const parsedSizeStr = pkg.targetSize.parsedSize
            ? formatSize(pkg.targetSize.parsedSize)
            : null;

          return (
            <div className={styles.collapseContainer}>
              <Overview
                style={{ backgroundColor: '#fff' }}
                title={
                  <Text
                    style={{ width: innerWidth > 1500 ? 900 : 700 }}
                    ellipsis={{
                      tooltip: root,
                    }}
                  >
                    {root}
                  </Text>
                }
                description={
                  <div className={styles.collapseChild}>
                    <div>
                      <div className={styles.attribute}>Version</div>
                      <div className={styles.iconContainer}>
                        <Icon
                          style={{ fontSize: '18px' }}
                          component={VersionSvg}
                        />
                        <span className={styles.data}>v{version}</span>
                      </div>
                    </div>
                    <div>
                      <div className={styles.attribute}>Source size</div>
                      <div className={styles.iconContainer}>
                        <Icon
                          style={{ fontSize: '18px' }}
                          component={SourceSizeSvg}
                        />
                        <span className={styles.data}>{sizeStr}</span>
                      </div>
                    </div>
                    <div>
                      <div className={styles.attribute}>Bundle size</div>
                      <div className={styles.iconContainer}>
                        <Icon
                          style={{ fontSize: '18px' }}
                          component={BundleSizeSvg}
                        />
                        <Tooltip
                          title={`The bundle size of "${name}" is ${sizeStr}, this is after bundled, concatenated module cannot get bundled size. `}
                        >
                          <span className={styles.data}>
                            {parsedSizeStr || 'CONCATENATED'}
                          </span>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                }
                icon={
                  <Paragraph
                    style={{ position: 'relative', top: '-10px' }}
                    copyable={{ text: root }}
                  />
                }
              />
              {idx !== packages.length - 1 ? (
                <Divider style={{ margin: '10px 0' }} />
              ) : null}
            </div>
          );
        });
      };

      return {
        key: data.code,
        label: (
          <LabelComponent
            title={
              <Tag style={{ backgroundColor: '#EAEDF1', borderRadius: '2px' }}>
                <span className={styles.pkgName}>{name}</span>
              </Tag>
            }
            description={`${packages.length} versions was found`}
            extra={
              <div className={styles.extraContainer}>
                <div className={styles.iconContainer}>
                  <Icon style={{ fontSize: '18px' }} component={TotalSizeSvg} />
                  <span className={styles.data}>{totalSizeStr}</span>
                </div>
                {packages && packages.length > 0 ? (
                  <TextDrawer
                    text="Show Relations"
                    buttonProps={{ size: 'small' }}
                    drawerProps={{ title: data.title, width: '60%' }}
                  >
                    <Space
                      direction="vertical"
                      className="alert-space"
                      style={{ width: '100%' }}
                    >
                      <Space
                        style={{
                          marginBottom: Size.BasePadding / 2,
                          width: '100%',
                        }}
                      >
                        <Title
                          text={
                            <Tag style={{ backgroundColor: '#EAEDF1' }}>
                              {name}
                            </Tag>
                          }
                          upperFirst={false}
                        />
                        <Typography.Text strong>
                          {versions.length}
                        </Typography.Text>
                        <Typography.Text> versions found</Typography.Text>
                      </Space>
                      <Tabs
                        size="middle"
                        items={
                          packages.map((pkg) => {
                            const { target, targetSize } = pkg;
                            return {
                              label: (
                                <Space className={styles.drawerLabelTitle}>
                                  <div>v{target.version}</div>
                                  <Tag className={styles.drawerLabelSize}>
                                    {formatSize(targetSize.sourceSize)}
                                  </Tag>
                                </Space>
                              ),
                              key: `${target.root}${target.name}${target.version}`,
                              children:
                                extraData.getPackageRelationContentComponent({
                                  data,
                                  package: pkg,
                                }),
                            };
                          })!
                        }
                      />
                    </Space>
                  </TextDrawer>
                ) : null}
              </div>
            }
          />
        ),
        children: <ChildComponent />,
      };
    });

  return (
    <Collapse
      style={{ width: '100%' }}
      defaultActiveKey={['E1001']}
      items={items}
    />
  );
};
