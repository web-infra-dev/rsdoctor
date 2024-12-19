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

import { Rule } from '@rsdoctor/types';

import { AlertProps } from '../Alert/types';

import styles from './collapse.module.scss';

const { Paragraph } = Typography;

const LabelComponent = (props: {
  title: string;
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

  const items = data.map((d) => {
    const { packages } = d as Rule.PackageRelationDiffRuleStoreData;
    const totalSize = sumBy(packages, (e) => e.targetSize.sourceSize);
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
              title={root}
              description={
                <div className={styles.collapseChild}>
                  <div>
                    <div className={styles.attribute}>Version</div>
                    <div className={styles.iconContainer}>
                      <Icon
                        style={{ fontSize: '18px' }}
                        component={VersionSvg}
                      />
                      <span className={styles.data}>v.{version}</span>
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
      key: d.code,
      label: (
        <LabelComponent
          title={name}
          description={`${data.length} versions was found`}
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
                  drawerProps={{ title: d.title, width: '60%' }}
                >
                  <Space direction="vertical" className="alert-space">
                    <Space style={{ marginBottom: Size.BasePadding / 2 }}>
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
                      <Typography.Text> versions was found</Typography.Text>
                    </Space>
                    <Tabs
                      size="middle"
                      items={
                        packages.map((pkg) => {
                          const { target, targetSize } = pkg;
                          return {
                            label: (
                              <Space className={styles.drawerLabelTitle}>
                                <div>v.{target.version}</div>
                                <Tag className={styles.drawerLabelSize}>
                                  {formatSize(targetSize.sourceSize)}
                                </Tag>
                              </Space>
                            ),
                            key: `${target.root}${target.name}${target.version}`,
                            children:
                              extraData.getPackageRelationContentComponent({
                                data: d as Rule.PackageRelationDiffRuleStoreData,
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
