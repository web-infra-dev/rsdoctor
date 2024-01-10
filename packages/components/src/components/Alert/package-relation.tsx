/* eslint-disable financial/no-float-calculation */
import React, { useState } from 'react';
import { Space, Alert, Button, Typography, Divider, Tabs, Row, Col, Timeline, Card, Tag, Empty, Popover } from 'antd';
import { sumBy } from 'lodash-es';
import { Rule, SDK } from '@rsdoctor/types';
import { ExpandAltOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useRuleIndexNavigate, formatSize, useI18n, useWindowWidth } from '../../utils';
import { TextDrawer } from '../TextDrawer';
import { Title } from '../Title';
import { Size, Color } from '../../constants';
import { Badge as Bdg } from '../Badge';
import { FileHightLightViewer } from '../CodeViewer';
import { PackageRelationAlertProps } from './types';
import { withServerAPI } from '../Manifest';

export const PackageRelationReasons: React.FC<{
  data: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetPackageRelationAlertDetails>;
  cwd: string;
}> = ({ data, cwd }) => {
  const [index, setIndex] = useState(0);
  const { t } = useI18n();

  return (
    <Row gutter={Size.BasePadding} wrap={false} align="top">
      <Col span={12} style={{ height: '100%' }}>
        <Card
          title={`The reasons for importing this version`}
          style={{ height: '100%' }}
          extra={
            <Popover content={<Typography.Text>{t('DuplicatePakCodeExplain')}</Typography.Text>}>
              <a href="#">Explain</a>
            </Popover>
          }
          bodyStyle={{ overflow: 'scroll' }}
        >
          {data.length ? (
            <React.Fragment>
              <div style={{ marginBottom: Size.BasePadding }}>
                <Typography.Text type="secondary" strong>
                  Click the file path below to show the reason in code viewer.
                </Typography.Text>
              </div>
              <Timeline>
                {data.map((e, i) => {
                  const { dependency, module, relativePath } = e!;
                  const { statements } = dependency;
                  const { start } = statements?.[0]?.position ? module.isPreferSource
                    ? statements[0].position.source!
                    : statements[0].position.transformed
                    : { start:{ line:0, column: 0 } };
                  const text = `${relativePath}:${start.line}:${start.column || 1}`;

                  return (
                    <Timeline.Item
                      key={text}
                      style={{ cursor: 'pointer' }}
                      dot={i === data.length - 1 ? undefined : '⬇️'}
                    >
                      <Typography.Text
                        copyable={{ text: relativePath }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIndex(i);
                        }}
                        strong={i === index}
                        style={{ color: i === index ? Color.Blue : 'inherit', display: 'block' }}
                      >
                        {text}
                      </Typography.Text>
                    </Timeline.Item>
                  );
                })}
              </Timeline>
            </React.Fragment>
          ) : (
            <Empty description={'This package no dependencies'} />
          )}
        </Card>
      </Col>
      <Col span={12} style={{ height: '100%' }}>
        <FileHightLightViewer {...data[index]!} key={index} cwd={cwd} />
      </Col>
    </Row>
  );
};

export const PackageRelationReasonsWithServer = withServerAPI({
  Component: PackageRelationReasons,
  api: SDK.ServerAPI.API.GetPackageRelationAlertDetails,
  responsePropName: 'data',
});

export const PackageRelationAlert: React.FC<PackageRelationAlertProps> = ({
  data,
  getPackageRelationContentComponent,
}) => {
  const { level, code, packages } = data;

  const navigate = useRuleIndexNavigate(code, data.link);
  const totalSize = sumBy(packages, (e) => e.targetSize.sourceSize);
  const totalSizeStr = formatSize(totalSize);
  const windowWith = useWindowWidth();
  const { name } = packages.find((e) => !!e.target.name)!.target;

  const versions = packages.map((item) => item.target.version);
  
  return (
    <Alert
      showIcon
      message={
        <Space>
          <Typography.Text code strong onClick={navigate} style={{ cursor: 'pointer' }}>
            <a>{code}</a>
          </Typography.Text>
          <Typography.Text strong>{Rule.RuleErrorMap[code as keyof Rule.RuleErrorCodes]?.title || data.title}</Typography.Text>
          <Divider type="vertical" />
          <Typography.Text>
            <Typography.Text strong code>
              {name}
            </Typography.Text>
            <Typography.Text strong> {data.packages.length}</Typography.Text>
            <Typography.Text> versions was found</Typography.Text>
          </Typography.Text>
          <Divider type="vertical" />
          <Bdg
            label={'total size'}
            value={totalSizeStr}
            type="error"
            tooltip={`total size of ${data.packages.length} versions is ${totalSizeStr}`}
          />
        </Space>
      }
      description={
        <Space direction="vertical" wrap={false}>
          {data.packages.map(({ target: el, targetSize: size }) => {
            const sizeStr = formatSize(size.sourceSize);
            const parsedSizeStr = size.parsedSize ? formatSize(size.parsedSize) : null;
            const name = `${el.name}@${el.version}`;
            return (
              <Space key={el.version} style={{ wordBreak: 'break-all' }} align="center">
                <Typography.Text style={{ marginLeft: 4 }}>└</Typography.Text>
                <Bdg label={el.name} value={`v${el.version}`} tooltip={name} />
              <Divider type="vertical" />
                <Bdg
                  label={
                    <div color={'rgb(255, 255, 255)'}>
                      Source Size <InfoCircleOutlined />
                    </div>
                  }
                  value={sizeStr}
                  tooltip={`The bundle size of "${name}" is ${sizeStr}, this is source size.`}
                  type="error"
                />
                <Bdg
                  label="Bundled size"
                  value={parsedSizeStr || 'CONCATENATED'}
                  tooltip={`The bundle size of "${name}" is ${sizeStr}, this is after bundled, concatenated module cannot get bundled size. `}
                  type="error"
                />

                <Divider type="vertical" />
                <Typography.Paragraph
                  style={{ marginBottom: 0, width: windowWith > 1500 ? '50vw' : windowWith > 1200 ? '40vw' : '30vw' }}
                  copyable={{ text: el.root }}
                  ellipsis={{ rows: 1, expandable: true, symbol: <ExpandAltOutlined />, tooltip: el.root }}
                  code
                >
              {el.root}
                </Typography.Paragraph>
              </Space>
            );
          })}
        </Space>
      }
      type={level === 'warn' ? 'info' : level}
      action={
        <React.Fragment>
          {packages && packages.length > 0 ? (
            <TextDrawer text="Show Relations" buttonProps={{ size: 'small' }} drawerProps={{ title: data.title }}>
              <Space direction="vertical" className="alert-space">
                <Space style={{ marginBottom: Size.BasePadding / 2 }}>
                  <Title text={name} upperFisrt={false} />
                  <Typography.Text strong>{versions.length}</Typography.Text>
                  <Typography.Text> versions was found: </Typography.Text>
                  {versions.map((e) => (
                    <Typography.Text strong code key={e}>
                      {e}
                    </Typography.Text>
                  ))}
                </Space>
                <Tabs
                  type="card"
                  size="middle"
                  className="tabs-space"
                  defaultActiveKey={versions[0]}
                  items={
                    packages.map((pkg) => {
                      const { target, targetSize } = pkg;
                      return {
                        label: (
                          <Space>
                            <Typography.Text>{`${name}@${target.version}`}</Typography.Text>
                            <Tag color={Color.Red}>{formatSize(targetSize.sourceSize)}</Tag>
                          </Space>
                        ),
                        key: `${target.root}${target.name}${target.version}`,
                        children: getPackageRelationContentComponent({ data, package: pkg }),
                      };
                    })!
                  }
                />
              </Space>
            </TextDrawer>
          ) : null}
          <Divider type="vertical" />
          <Button type="link" onClick={navigate} size="small" icon={<InfoCircleOutlined />} />
        </React.Fragment>
      }
    />
  );
};
