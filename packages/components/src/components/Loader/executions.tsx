import { ClockCircleTwoTone } from '@ant-design/icons';
import { SDK } from '@rsdoctor/types';
import {
  Col,
  Divider,
  Empty,
  List,
  Row,
  Space,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { PropsWithChildren, useCallback, useState } from 'react';
import InputIcon from 'src/common/svg/loader/input.svg';
import OutputIcon from 'src/common/svg/loader/output.svg';
import StepIcon from 'src/common/svg/loader/step.svg';
import { Size } from '../../constants';
import { beautifyPath, formatCosts, useTheme } from '../../utils';
import { CodeViewer, DiffViewer } from '../base';
import { Card } from '../Card';
import { CodeOpener } from '../Opener';
import { Title } from '../Title';
import { ServerAPIProvider } from '../Manifest';
import styles from './Analysis/style.module.scss';

interface LoaderExecutionsProps {
  cwd: string;
  data: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetLoaderFileDetails>;
  index?: number;
}

const LoaderPropsItem = ({
  loader,
  resource,
  cwd,
}: {
  loader: Omit<SDK.LoaderTransformData, 'input' | 'result'> & {
    costs: number;
  };
  resource: SDK.ResourceData;
  cwd: string;
}): JSX.Element => {
  return (
    <Card
      title={'Loader Details'}
      style={{ border: 'none' }}
      extra={
        <Tag icon={<ClockCircleTwoTone />} color="default">
          {dayjs(loader.startAt).format('YYYY-MM-DD HH:mm:ss')}
        </Tag>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {loader.isPitch ? <Typography.Text code>pitch</Typography.Text> : null}
        <List size="large" bordered>
          <List.Item>
            <Typography.Text strong>{'File Path'}</Typography.Text>
            <div>{beautifyPath(resource.path, cwd)}</div>
          </List.Item>
          <List.Item>
            <Typography.Text strong>{'Resource Path'}</Typography.Text>
            <CodeOpener cwd={cwd} url={resource.path} loc="" disabled />
          </List.Item>
          <List.Item>
            <Typography.Text strong>{'Resource Query'}</Typography.Text>
            <div>{resource.queryRaw || '-'}</div>
          </List.Item>
          <List.Item>
            <Typography.Text strong>{'Duration'}</Typography.Text>
            <div>{formatCosts(loader.costs)}</div>
          </List.Item>
          <List.Item>
            <Typography.Text strong>{'Loader'}</Typography.Text>
            <div>
              <Typography.Text code>{loader.loader}</Typography.Text>
            </div>
          </List.Item>
          <List.Item>
            <Typography.Text strong>{'Loader Index'}</Typography.Text>
            <div>{`${loader.loaderIndex}`}</div>
          </List.Item>
          <List.Item>
            <Typography.Text strong>{'Loader Path'}</Typography.Text>
            <CodeOpener cwd={cwd} url={loader.path} loc="" disabled />
          </List.Item>
          <List.Item>
            <div style={{ width: 180 }}>
              <Typography.Text strong>{'Options'}</Typography.Text>
            </div>
            <Divider type="vertical" />
            <Typography.Paragraph
              ellipsis={{
                rows: 2,
                expandable: true,
                symbol: 'more',
              }}
              copyable
            >
              {JSON.stringify(loader.options || '-')}
            </Typography.Paragraph>
          </List.Item>
        </List>
      </Space>
    </Card>
  );
};

// Component to render Loader Details content with lazy-loaded code
const LoaderDetailsContent = ({
  loader,
  resource,
  isLight,
  codeData,
}: {
  loader: Omit<SDK.LoaderTransformData, 'input' | 'result'> & { costs: number };
  resource: SDK.ResourceData;
  isLight: boolean;
  codeData: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetLoaderFileInputAndOutput>;
}): JSX.Element => {
  const hasError = loader.errors && loader.errors.length;
  const before = codeData?.input || '';
  const loaderResult = codeData?.output || '';

  return (
    <div style={{ height: '100%' }}>
      {hasError ? (
        <Col span={24} style={{ height: '53%', minHeight: 400 }}>
          <div
            style={{
              padding: Size.BasePadding,
              borderTop: `1px solid ${isLight ? '#f0f0f0' : 'rgba(253, 253, 253, 0.12)'}`,
              borderBottom: `1px solid ${isLight ? '#f0f0f0' : 'rgba(253, 253, 253, 0.12)'}`,
            }}
          >
            <Title
              text={`the error stack of [${loader.loader}] ${loader.isPitch ? 'pitch' : ''}`}
            />
          </div>
          <div style={{ height: '90%' }}>
            <CodeViewer code={loader.errors[0].message} lang="javascript" />
          </div>
        </Col>
      ) : (
        <Col span={24} style={{ height: '53%', minHeight: 400 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: Size.BasePadding,
              borderBottom: `1px solid ${isLight ? '#f0f0f0' : 'rgba(253, 253, 253, 0.12)'}`,
            }}
          >
            <Title
              text={
                <>
                  {`the result of [${loader.loader}] ${loader.isPitch ? 'pitch' : ''}`}
                  {!loader.isPitch && (
                    <span style={{ fontWeight: 400 }}>
                      (
                      <InputIcon
                        style={{
                          verticalAlign: 'middle',
                          margin: '0 2px',
                        }}
                      />
                      Input ⟷
                      <OutputIcon
                        style={{
                          verticalAlign: 'middle',
                          position: 'relative',
                          top: -2,
                        }}
                      />
                      Output)
                    </span>
                  )}
                </>
              }
            />
            <div style={{ flex: 1 }} />
          </div>
          {loader.isPitch ? (
            loaderResult ? (
              <div style={{ height: '90%' }}>
                <CodeViewer
                  isEmbed
                  code={loaderResult}
                  filePath={resource.path}
                />
              </div>
            ) : (
              <Empty
                description={
                  'No loader result. If you use the Brief Mode, there will not have loader results.'
                }
              />
            )
          ) : (
            <div style={{ minHeight: '700px' }}>
              <div style={{ height: '40rem', overflow: 'hidden' }}>
                {!loaderResult && !before ? (
                  <Empty
                    description={
                      'No loader result. If you use the Brief Mode, there will not have loader results.'
                    }
                  />
                ) : (
                  <DiffViewer
                    isEmbed
                    original={before}
                    modified={loaderResult || ''}
                    originalFilePath={resource.path}
                    modifiedFilePath={resource.path}
                  />
                )}
              </div>
            </div>
          )}
        </Col>
      )}
    </div>
  );
};

export const LoaderExecutions = ({
  data,
  cwd,
  index,
}: PropsWithChildren<LoaderExecutionsProps>): JSX.Element => {
  const { loaders, resource } = data;
  const [currentIndex, setCurrentIndex] = useState(index || 0);
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const loader = loaders[currentIndex];
  const leftSpan = 5;
  const [activeKey, setActiveKey] = useState('loaderDetails');
  const onChange = useCallback((key: string) => {
    setActiveKey(key);
  }, []);

  return (
    <Row className={styles.executions} style={{ height: '100%' }}>
      <Col
        span={leftSpan}
        style={{
          borderRight: isLight ? `1px solid #f0f0f0` : undefined,
          padding: Size.BasePadding,
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title text="Executions" />
          <Timeline mode="left" style={{ marginTop: Size.BasePadding }}>
            {loaders.map((e, i, arr) => {
              const { loader, isPitch } = e;
              const costs = formatCosts(e.costs);
              return (
                <Timeline.Item
                  dot={
                    isPitch ? (
                      <Tag style={{ marginLeft: 1, fontWeight: 500 }}>
                        pitch
                      </Tag>
                    ) : (
                      <ClockCircleTwoTone />
                    )
                  }
                  style={{ paddingBottom: 10, textAlign: 'center' }}
                  key={i}
                >
                  <Row align="middle" justify="space-between" gutter={[0, 10]}>
                    <Col span={24} className={styles.timeline}>
                      <Tooltip title={loader} trigger="hover">
                        <div
                          className={`${styles.box} ${currentIndex === i ? styles.selected : ''}`}
                          onClick={() => {
                            setCurrentIndex(i);
                          }}
                          style={{ textAlign: 'left' }}
                        >
                          <div>
                            <Typography.Text style={{ color: '#000' }}>
                              {costs.match(/[0-9]*\.?[0-9]+/g)?.[0]}
                            </Typography.Text>
                            {` `}
                            <Typography.Text
                              style={{ color: 'rgba(0,0,0,0.45)' }}
                            >
                              {costs.match(/[a-zA-Z]+/g)}
                            </Typography.Text>
                          </div>
                          <Typography.Text
                            style={{ color: 'rgba(0,0,0,0.65)' }}
                            className={styles.loader}
                          >
                            {loader}
                          </Typography.Text>
                        </div>
                      </Tooltip>
                    </Col>
                  </Row>
                  {i === arr.length - 1 ? null : (
                    <div style={{ paddingTop: 10 }}>
                      <StepIcon />
                    </div>
                  )}
                </Timeline.Item>
              );
            })}
          </Timeline>
        </Space>
      </Col>
      <Col span={24 - leftSpan} style={{ height: '100%' }}>
        <Tabs
          type="card"
          defaultActiveKey="loaderDetails"
          activeKey={activeKey}
          items={[
            {
              label: 'Loader Props',
              key: 'loaderProps',
              children: (
                <LoaderPropsItem
                  loader={loader}
                  resource={resource}
                  cwd={cwd}
                />
              ),
            },
            {
              label: 'Loader Details',
              key: 'loaderDetails',
              children:
                activeKey === 'loaderDetails' ? (
                  <ServerAPIProvider
                    api={SDK.ServerAPI.API.GetLoaderFileInputAndOutput}
                    body={{
                      file: resource.path,
                      loader: loader.loader,
                      loaderIndex: loader.loaderIndex,
                    }}
                    showSkeleton={false}
                  >
                    {(codeData) => (
                      <LoaderDetailsContent
                        loader={loader}
                        resource={resource}
                        isLight={isLight}
                        codeData={codeData}
                      />
                    )}
                  </ServerAPIProvider>
                ) : null,
            },
          ]}
          onChange={onChange}
        />
      </Col>
    </Row>
  );
};
