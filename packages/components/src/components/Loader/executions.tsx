import { ClockCircleOutlined } from '@ant-design/icons';
import { Row, Space, Badge, Col, Typography, Button, Divider, Timeline, Tooltip, Empty, Tag } from 'antd';
import { PropsWithChildren, useState } from 'react';
import type { TextProps } from 'antd/lib/typography/Text';
import type { EllipsisConfig } from 'antd/lib/typography/Base';
import { Constants, SDK } from '@rsdoctor/types';
import Editor from '@monaco-editor/react';
import dayjs from 'dayjs';
import { endsWith } from 'lodash-es';
import { formatCosts, getModifiedLanguage, useTheme, beautifyPath } from '../../utils';
import { Title } from '../Title';
import { Size } from '../../constants';
import { CodeOpener } from '../Opener';
import { DiffViewer } from '../CodeViewer';
import { JSIsEqualTag } from '../worker/jsequal/client';

interface LoaderExecutionsProps {
  cwd: string;
  data: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetLoaderFileDetails>;
  index?: number;
}

const LoaderInfoItem = ({
  label,
  value,
  ellipsis = false,
  ...textProps
}: {
  label: string;
  value: string | JSX.Element;
  ellipsis?: EllipsisConfig;
} & TextProps): JSX.Element => {
  return (
    <Row>
      <Col span={6}>
        <Space>
          <Badge status="processing" />
          <div style={{ width: 180 }}>
            <Typography.Text strong code>
              {label}
            </Typography.Text>
          </div>
          <Divider type="vertical" />
        </Space>
      </Col>
      <Col span={18}>
        <Typography.Paragraph ellipsis={ellipsis} strong {...textProps}>
          {value}
        </Typography.Paragraph>
      </Col>
    </Row>
  );
};

export const LoaderExecutions = ({ data, cwd, index }: PropsWithChildren<LoaderExecutionsProps>): JSX.Element => {
  const { loaders, resource } = data;
  const [currentIndex, setCurrentIndex] = useState(index || 0);

  const { theme } = useTheme();
  const isLight = theme === 'light';

  const loader = loaders[currentIndex];

  const before = loader.input || '';

  const leftSpan = 5;

  const hasError = loader.errors && loader.errors.length;

  return (
    <Row style={{ height: '100%' }}>
      <Col
        span={leftSpan}
        style={{ borderRight: isLight ? `1px solid #f0f0f0` : undefined, padding: Size.BasePadding }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title text="Executions" />
          <Timeline mode="left" style={{ marginTop: Size.BasePadding }}>
            {loaders.map((e, i, arr) => {
              const { loader, isPitch } = e;
              return (
                <Timeline.Item
                  dot={isPitch ? <Tag style={{ marginLeft: 1, fontWeight: 500 }}>pitch</Tag> : <ClockCircleOutlined />}
                  style={{ paddingBottom: 10, textAlign: 'center' }}
                  key={i}
                >
                  <Row align="middle" justify="space-between" gutter={[0, 10]}>
                    <Col span={24}>
                      <Tooltip title={loader} trigger="hover">
                        <Button
                          type={i === currentIndex ? 'primary' : 'default'}
                          block
                          onClick={() => {
                            setCurrentIndex(i);
                          }}
                          style={{ textAlign: 'left' }}
                        >
                          <Typography.Text ellipsis style={{ color: 'inherit' }}>
                            <Typography.Text strong style={{ color: 'inherit' }}>
                              {formatCosts(e.costs)}
                            </Typography.Text>
                            <Divider type="vertical" />
                            {loader}
                          </Typography.Text>
                        </Button>
                      </Tooltip>
                    </Col>
                  </Row>
                  {i === arr.length - 1 ? null : (
                    <div style={{ paddingTop: 10 }}>
                      <Typography.Text>⬇️</Typography.Text>
                    </div>
                  )}
                </Timeline.Item>
              );
            })}
          </Timeline>
        </Space>
      </Col>
      <Col span={24 - leftSpan} style={{ height: '100%' }}>
        <Col span={24}>
          <Space direction="vertical" style={{ padding: Size.BasePadding, wordBreak: 'break-all' }}>
            <Row justify="space-between" align="middle" style={{ paddingBottom: Size.BasePadding / 2 }}>
              <Col>
                <Space>
                  <Title text="Loader Details" />
                  {loader.isPitch ? <Typography.Text code>pitch</Typography.Text> : null}
                  {loader.isPitch || hasError || !endsWith(resource.path, Constants.JSExtension) ? null : (
                    <JSIsEqualTag input={before} output={loader.result || ''} />
                  )}
                </Space>
              </Col>
              <Col>
                <Tag icon={<ClockCircleOutlined />} color="default">
                  {dayjs(loader.startAt).format('YYYY-MM-DD HH:mm:ss')}
                </Tag>
              </Col>
            </Row>
            <LoaderInfoItem label="file path" value={beautifyPath(resource.path, cwd)} code />
            <LoaderInfoItem
              label="resource path"
              value={<CodeOpener cwd={cwd} url={resource.path} loc="" disabled />}
            />
            <LoaderInfoItem label="resource query" value={resource.queryRaw || '-'} />
            <LoaderInfoItem label="duration" value={formatCosts(loader.costs)} mark />
            <LoaderInfoItem label="loader name" value={loader.loader} code />
            <LoaderInfoItem label="loader index" value={`${loader.loaderIndex}`} />
            <LoaderInfoItem label="loader path" value={<CodeOpener cwd={cwd} url={loader.path} loc="" disabled />} />
            <LoaderInfoItem
              label="options"
              value={JSON.stringify(loader.options || '-')}
              copyable
              ellipsis={{
                rows: 2,
                expandable: true,
                symbol: 'more',
              }}
            />
          </Space>
        </Col>
        {hasError ? (
          <Col span={24} style={{ height: '53%', minHeight: 400 }}>
            <div
              style={{
                padding: Size.BasePadding,
                borderTop: `1px solid ${isLight ? '#f0f0f0' : 'rgba(253, 253, 253, 0.12)'}`,
                borderBottom: `1px solid ${isLight ? '#f0f0f0' : 'rgba(253, 253, 253, 0.12)'}`,
              }}
            >
              <Title text={`the error stack of [${loader.loader}] ${loader.isPitch ? 'pitch' : ''}`} />
            </div>
            <div style={{ height: '90%' }}>
              <Editor
                theme="vs-dark"
                options={{
                  readOnly: true,
                  domReadOnly: true,
                  fontSize: 14,
                  minimap: { enabled: false },
                  lineNumbers: 'off',
                }}
                value={loader.errors[0].message}
                language="javascript"
              />
            </div>
          </Col>
        ) : (
          <Col span={24} style={{ height: '53%', minHeight: 400 }}>
            <div
              style={{
                padding: Size.BasePadding,
                borderTop: `1px solid ${isLight ? '#f0f0f0' : 'rgba(253, 253, 253, 0.12)'}`,
                borderBottom: `1px solid ${isLight ? '#f0f0f0' : 'rgba(253, 253, 253, 0.12)'}`,
              }}
            >
              <Title text={`the result of [${loader.loader}] ${loader.isPitch ? 'pitch' : ''}`} />
            </div>
            {loader.isPitch ? (
              loader.result ? (
                <div style={{ height: '90%' }}>
                  <Editor
                    theme="vs-dark"
                    options={{ readOnly: true, domReadOnly: true, fontSize: 14 }}
                    value={loader.result}
                    language={getModifiedLanguage(resource.path)}
                  />
                </div>
              ) : (
                <Empty />
              )
            ) : (
              <div style={{ height: '90%' }}>
                <Row>
                  <Col span={12} style={{ padding: `${Size.BasePadding / 2}px ${Size.BasePadding}px` }}>
                    <Typography.Text strong>Input</Typography.Text>
                  </Col>
                  <Col
                    span={12}
                    style={{
                      padding: `${Size.BasePadding / 2}px ${Size.BasePadding}px`,
                    }}
                  >
                    <Typography.Text strong>Output</Typography.Text>
                  </Col>
                </Row>
                <div style={{ height: '86%' }}>
                  <DiffViewer filepath={resource.path} before={before} after={loader.result || ''} />
                </div>
              </div>
            )}
          </Col>
        )}
      </Col>
    </Row>
  );
};
