/* eslint-disable financial/no-float-calculation */
import {
  Space,
  Alert,
  Button,
  Typography,
  Divider,
  Tabs,
  Row,
  Col,
  Timeline,
  Tag,
  Empty,
  Grid,
} from 'antd';
import { sumBy } from 'lodash-es';
import {
  ExpandAltOutlined,
  InfoCircleOutlined,
  DoubleRightOutlined,
} from '@ant-design/icons';

import { useRuleIndexNavigate, formatSize } from '../../utils';
import { TextDrawer } from '../TextDrawer';
import { Title } from '../Title';
import { Size, Color } from '../../constants';
import { Badge as Bdg } from '../Badge';
import { withServerAPI } from '../Manifest';

import { Rule, SDK } from '@rsdoctor/types';

import { PackageRelationAlertProps } from './types';

import styles from './package-relation.module.scss';

const TextDrawerWidth = '60%';

export const PackageRelationReasons: React.FC<{
  data: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetPackageRelationAlertDetails>;
  cwd: string;
}> = ({ data }) => {
  return (
    <Row gutter={Size.BasePadding} wrap={false} align="top">
      <Col style={{ height: '100%', width: '100%' }}>
        {data.length ? (
          <>
            <Timeline style={{ marginTop: '20px' }}>
              {data.map((e, i) => {
                const { dependency, module, relativePath } = e!;
                const { statements } = dependency;
                const { start } = statements?.[0]?.position
                  ? module.isPreferSource
                    ? statements[0].position.source!
                    : statements[0].position.transformed
                  : { start: { line: 0, column: 0 } };
                const text = `${relativePath}:${start.line}:${
                  start.column || 1
                }`;

                return (
                  <Timeline.Item key={text} style={{ cursor: 'default' }}>
                    <Typography.Text>
                      <div className={styles.filePath}>
                        {text}
                        <Typography.Paragraph
                          copyable={{ text: relativePath }}
                          style={{ position: 'relative', top: '7px' }}
                        />
                      </div>
                      {i !== data.length - 1 ? (
                        <DoubleRightOutlined className={styles.arrow} />
                      ) : null}
                    </Typography.Text>
                  </Timeline.Item>
                );
              })}
            </Timeline>
          </>
        ) : (
          <Empty description={'This package no dependencies'} />
        )}
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
  const { xs, lg, xxl } = Grid.useBreakpoint();
  const { name } = packages.find((e) => !!e.target.name)!.target;

  const versions = packages.map((item) => item.target.version);

  return (
    <Alert
      showIcon={!xs}
      message={
        <Space
          wrap
          split={xs ? null : <Divider type="vertical" />}
          align="center"
        >
          <Space wrap={false}>
            <Typography.Text
              code
              strong
              onClick={navigate}
              style={{ cursor: 'pointer' }}
            >
              <a>{code}</a>
            </Typography.Text>
            <Typography.Text strong>
              {Rule.RuleErrorMap[code as keyof Rule.RuleErrorCodes]?.title ||
                data.title}
            </Typography.Text>
          </Space>
          <Typography.Paragraph
            ellipsis={{ rows: 1 }}
            style={{ marginBottom: 0 }}
          >
            <Typography.Text strong code>
              {name}
            </Typography.Text>
            <Typography.Text strong> {data.packages.length}</Typography.Text>
            <Typography.Text> versions was found</Typography.Text>
          </Typography.Paragraph>
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
            const parsedSizeStr = size.parsedSize
              ? formatSize(size.parsedSize)
              : null;
            const name = `${el.name}@${el.version}`;
            return (
              <Space
                key={el.version}
                style={{ wordBreak: 'break-all' }}
                align="center"
                split={xs ? null : <Divider type="vertical" />}
                wrap
              >
                <Space wrap={false}>
                  <Typography.Text style={{ marginLeft: 4 }}>└</Typography.Text>
                  <Bdg
                    label={el.name}
                    value={`v${el.version}`}
                    tooltip={name}
                  />
                </Space>
                <Space>
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
                </Space>

                <Typography.Paragraph
                  style={{
                    marginBottom: 0,
                    width: xxl ? '40rem' : lg ? '30rem' : '20rem',
                  }}
                  copyable={{ text: el.root }}
                  ellipsis={{
                    rows: 1,
                    expandable: true,
                    symbol: <ExpandAltOutlined />,
                    tooltip: el.root,
                  }}
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
        <>
          {packages && packages.length > 0 ? (
            <TextDrawer
              text="Show Relations"
              buttonProps={{ size: 'small' }}
              drawerProps={{ title: data.title, width: TextDrawerWidth }}
            >
              <Space direction="vertical" className="alert-space">
                <Space style={{ marginBottom: Size.BasePadding / 2 }}>
                  <Title text={name} upperFirst={false} />
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
                            <Tag color={Color.Red}>
                              {formatSize(targetSize.sourceSize)}
                            </Tag>
                          </Space>
                        ),
                        key: `${target.root}${target.name}${target.version}`,
                        children: getPackageRelationContentComponent({
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
          <Divider type="vertical" />
          <Button
            type="link"
            onClick={navigate}
            size="small"
            icon={<InfoCircleOutlined />}
          />
        </>
      }
    />
  );
};
