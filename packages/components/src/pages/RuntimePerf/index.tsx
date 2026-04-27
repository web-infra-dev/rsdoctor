import React from 'react';
import {
  Card,
  Table,
  Tag,
  Tooltip,
  Typography,
  Empty,
  Spin,
  Statistic,
  Row,
  Col,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SDK } from '@rsdoctor/types';
import { ServerAPIProvider } from '../../components/Manifest';
import style from './index.module.scss';

const { Title, Text } = Typography;

/** Format milliseconds for display */
function formatMs(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)} μs`;
  if (ms < 1000) return `${ms.toFixed(1)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/** Format bytes for display */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Extract filename from full URL */
function getFileName(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    return pathname.split('/').pop() || url;
  } catch {
    return url.split('/').pop() || url;
  }
}

/** Get color tag for vital rating */
function getRatingColor(rating: 'good' | 'needs-improvement' | 'poor'): string {
  switch (rating) {
    case 'good':
      return 'green';
    case 'needs-improvement':
      return 'orange';
    case 'poor':
      return 'red';
    default:
      return 'default';
  }
}

/** Format vital metric value depending on type */
function formatVitalValue(name: string, value: number): string {
  if (name === 'CLS') return value.toFixed(3);
  return formatMs(value);
}

/** Web Vitals display section */
const VitalsSection: React.FC<{ vitals: SDK.WebVitalMetric[] }> = ({
  vitals,
}) => {
  if (!vitals || vitals.length === 0) {
    return (
      <Card title="Web Vitals" className={style.section}>
        <Empty description="No Web Vitals data collected yet. Please visit the application in a browser." />
      </Card>
    );
  }

  // Deduplicate by name, keep latest
  const latestVitals = new Map<string, SDK.WebVitalMetric>();
  for (const v of vitals) {
    const existing = latestVitals.get(v.name);
    if (!existing || v.timestamp > existing.timestamp) {
      latestVitals.set(v.name, v);
    }
  }

  const orderedNames = ['TTFB', 'FCP', 'LCP', 'CLS', 'INP'] as const;
  const ordered = orderedNames
    .map((name) => latestVitals.get(name))
    .filter(Boolean) as SDK.WebVitalMetric[];

  return (
    <Card title="Web Vitals" className={style.section}>
      <Row gutter={[16, 16]}>
        {ordered.map((vital) => (
          <Col key={vital.name} xs={12} sm={8} md={6} lg={4}>
            <Card className={style.vitalCard} size="small">
              <Statistic
                title={vital.name}
                value={formatVitalValue(vital.name, vital.value)}
                valueStyle={{
                  color:
                    vital.rating === 'good'
                      ? '#52c41a'
                      : vital.rating === 'needs-improvement'
                        ? '#faad14'
                        : '#ff4d4f',
                }}
                suffix={
                  <Tag color={getRatingColor(vital.rating)}>{vital.rating}</Tag>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );
};

/** Resource timeline waterfall visualization */
const ResourceTimeline: React.FC<{
  timings: SDK.ResourceTimingData[];
}> = ({ timings }) => {
  if (!timings || timings.length === 0) return null;

  const maxTime = Math.max(
    ...timings.map((t) => t.responseEnd || t.startTime + t.duration),
  );
  const barColors = {
    dns: '#8884d8',
    connect: '#82ca9d',
    request: '#ffc658',
    response: '#ff7c43',
  };

  return (
    <div className={style.timelineContainer}>
      <div style={{ minWidth: 600 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '0 0 8px 200px',
            fontSize: 12,
            color: '#999',
          }}
        >
          <span>0ms</span>
          <span>{formatMs(maxTime / 4)}</span>
          <span>{formatMs(maxTime / 2)}</span>
          <span>{formatMs((maxTime * 3) / 4)}</span>
          <span>{formatMs(maxTime)}</span>
        </div>
        {timings.slice(0, 50).map((timing, idx) => {
          const left = maxTime > 0 ? (timing.startTime / maxTime) * 100 : 0;
          const width =
            maxTime > 0
              ? Math.max((timing.duration / maxTime) * 100, 0.5)
              : 0.5;

          // Breakdown segments
          const dnsWidth = timing.domainLookupEnd - timing.domainLookupStart;
          const connectWidth = timing.connectEnd - timing.connectStart;
          const requestWidth = timing.responseStart - timing.requestStart;
          const responseWidth = timing.responseEnd - timing.responseStart;

          return (
            <Tooltip
              key={`${timing.name}-${idx}`}
              title={
                <div>
                  <div>
                    <strong>{getFileName(timing.name)}</strong>
                  </div>
                  <div>Start: {formatMs(timing.startTime)}</div>
                  <div>Duration: {formatMs(timing.duration)}</div>
                  <div>
                    Size: {formatBytes(timing.transferSize)}
                    {timing.fromCache ? ' (cached)' : ''}
                  </div>
                  {dnsWidth > 0 && <div>DNS: {formatMs(dnsWidth)}</div>}
                  {connectWidth > 0 && (
                    <div>Connect: {formatMs(connectWidth)}</div>
                  )}
                  {requestWidth > 0 && (
                    <div>Request→TTFB: {formatMs(requestWidth)}</div>
                  )}
                  {responseWidth > 0 && (
                    <div>Response: {formatMs(responseWidth)}</div>
                  )}
                  <div>Protocol: {timing.nextHopProtocol || 'N/A'}</div>
                </div>
              }
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: 2,
                  height: 22,
                }}
              >
                <div
                  className={style.resourceName}
                  style={{ width: 200, flexShrink: 0, fontSize: 12 }}
                >
                  <Tag
                    color={
                      timing.initiatorType === 'script' ? 'blue' : 'purple'
                    }
                    style={{
                      fontSize: 10,
                      lineHeight: '14px',
                      padding: '0 4px',
                    }}
                  >
                    {timing.initiatorType === 'script' ? 'JS' : 'CSS'}
                  </Tag>
                  {getFileName(timing.name)}
                </div>
                <div style={{ flex: 1, position: 'relative', height: '100%' }}>
                  <div
                    className={`${style.timelineBar} ${timing.fromCache ? style.cached : ''}`}
                    style={{
                      position: 'absolute',
                      left: `${left}%`,
                      width: `${width}%`,
                      background: timing.fromCache
                        ? '#d9d9d9'
                        : `linear-gradient(to right, ${barColors.dns} ${dnsWidth}%, ${barColors.connect} ${dnsWidth}%, ${barColors.connect} ${dnsWidth + connectWidth}%, ${barColors.request} ${dnsWidth + connectWidth}%, ${barColors.request} ${dnsWidth + connectWidth + requestWidth}%, ${barColors.response})`,
                      top: 0,
                    }}
                  />
                </div>
              </div>
            </Tooltip>
          );
        })}
        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12 }}>
          <span>
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                background: barColors.dns,
                marginRight: 4,
              }}
            />
            DNS
          </span>
          <span>
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                background: barColors.connect,
                marginRight: 4,
              }}
            />
            Connect
          </span>
          <span>
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                background: barColors.request,
                marginRight: 4,
              }}
            />
            Request
          </span>
          <span>
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                background: barColors.response,
                marginRight: 4,
              }}
            />
            Response
          </span>
          <span>
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                background: '#d9d9d9',
                marginRight: 4,
              }}
            />
            Cached
          </span>
        </div>
      </div>
    </div>
  );
};

/** Resource Timings table section */
const ResourceTimingsSection: React.FC<{
  timings: SDK.ResourceTimingData[];
}> = ({ timings }) => {
  if (!timings || timings.length === 0) {
    return (
      <Card title="Resource Timing (Chunk Loading)" className={style.section}>
        <Empty description="No resource timing data collected yet. Please visit the application in a browser." />
      </Card>
    );
  }

  const columns: ColumnsType<SDK.ResourceTimingData> = [
    {
      title: 'Resource',
      dataIndex: 'name',
      key: 'name',
      width: 300,
      render: (url: string, record) => (
        <Tooltip title={url}>
          <div className={style.resourceName}>
            <Tag color={record.initiatorType === 'script' ? 'blue' : 'purple'}>
              {record.initiatorType === 'script' ? 'JS' : 'CSS'}
            </Tag>
            {getFileName(url)}
          </div>
        </Tooltip>
      ),
      sorter: (a, b) => getFileName(a.name).localeCompare(getFileName(b.name)),
    },
    {
      title: 'Start',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 100,
      render: (v: number) => formatMs(v),
      sorter: (a, b) => a.startTime - b.startTime,
      defaultSortOrder: 'ascend',
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (v: number) => (
        <Text type={v > 1000 ? 'danger' : v > 300 ? 'warning' : undefined}>
          {formatMs(v)}
        </Text>
      ),
      sorter: (a, b) => a.duration - b.duration,
    },
    {
      title: 'Transfer Size',
      dataIndex: 'transferSize',
      key: 'transferSize',
      width: 120,
      render: (v: number, record) => (
        <span>
          {formatBytes(v)}
          {record.fromCache && (
            <Tag color="green" style={{ marginLeft: 4 }}>
              cached
            </Tag>
          )}
        </span>
      ),
      sorter: (a, b) => a.transferSize - b.transferSize,
    },
    {
      title: 'Decoded Size',
      dataIndex: 'decodedBodySize',
      key: 'decodedBodySize',
      width: 120,
      render: (v: number) => formatBytes(v),
      sorter: (a, b) => a.decodedBodySize - b.decodedBodySize,
    },
    {
      title: 'TTFB',
      key: 'ttfb',
      width: 100,
      render: (_: unknown, record: SDK.ResourceTimingData) => {
        const ttfb = record.responseStart - record.requestStart;
        return ttfb > 0 ? formatMs(ttfb) : '-';
      },
      sorter: (a, b) =>
        a.responseStart - a.requestStart - (b.responseStart - b.requestStart),
    },
    {
      title: 'Protocol',
      dataIndex: 'nextHopProtocol',
      key: 'protocol',
      width: 90,
      render: (v: string) => v || '-',
    },
  ];

  // Summary stats
  const totalTransfer = timings.reduce((sum, t) => sum + t.transferSize, 0);
  const cachedCount = timings.filter((t) => t.fromCache).length;
  const jsTimings = timings.filter((t) => t.initiatorType === 'script');
  const cssTimings = timings.filter(
    (t) => t.initiatorType === 'link' || t.initiatorType === 'css',
  );
  const avgDuration =
    timings.length > 0
      ? timings.reduce((sum, t) => sum + t.duration, 0) / timings.length
      : 0;
  const maxDuration = Math.max(...timings.map((t) => t.duration), 0);

  return (
    <Card title="Resource Timing (Chunk Loading)" className={style.section}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Statistic
            title="Total Resources"
            value={timings.length}
            suffix={
              <Text type="secondary" style={{ fontSize: 12 }}>
                ({jsTimings.length} JS / {cssTimings.length} CSS)
              </Text>
            }
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="Total Transfer"
            value={formatBytes(totalTransfer)}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic title="Avg Duration" value={formatMs(avgDuration)} />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="Cache Hit"
            value={cachedCount}
            suffix={`/ ${timings.length}`}
          />
        </Col>
      </Row>

      <Title level={5}>Waterfall Timeline</Title>
      <ResourceTimeline timings={timings} />

      <Title level={5} style={{ marginTop: 24 }}>
        Detailed Timing
        {maxDuration > 1000 && (
          <Tag color="red" style={{ marginLeft: 8 }}>
            Slow resource detected ({formatMs(maxDuration)})
          </Tag>
        )}
      </Title>
      <Table<SDK.ResourceTimingData>
        columns={columns}
        dataSource={timings}
        rowKey={(record) => `${record.name}-${record.startTime}`}
        pagination={timings.length > 20 ? { pageSize: 20 } : false}
        size="small"
        scroll={{ x: 900 }}
      />
    </Card>
  );
};

/** Main RuntimePerf page component */
const RuntimePerfContent: React.FC<{
  data: SDK.RuntimePerfData;
}> = ({ data }) => {
  return (
    <div className={style.runtimePerfPage}>
      <Title level={3}>Runtime Performance</Title>
      <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
        Performance Timeline data collected from the browser at runtime.
        {data.url && (
          <>
            {' '}
            Page: <Text code>{data.url}</Text>
          </>
        )}
      </Text>

      <VitalsSection vitals={data.vitals} />
      <ResourceTimingsSection timings={data.resourceTimings || []} />
    </div>
  );
};

const Component: React.FC = () => {
  return (
    <ServerAPIProvider api={SDK.ServerAPI.API.GetWebVitals}>
      {(response) => {
        if (!response) {
          return <Spin tip="Loading runtime performance data..." />;
        }
        return <RuntimePerfContent data={response} />;
      }}
    </ServerAPIProvider>
  );
};

export const Page = Component;

export * from './constants';
