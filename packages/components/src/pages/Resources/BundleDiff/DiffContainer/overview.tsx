import React from 'react';
import { Space, Table, Tag, Typography } from 'antd';
import { Client } from '@rsdoctor/types';

import { BundleDiffTableOverviewData } from './types';
import { formatSize } from '../../../../utils';
import { Percent } from '../../../../components/Card/diff';
import { Color, Size } from '../../../../constants';
import { formatDiffSize } from './utils';

export const Overview: React.FC<{
  assetsDiffResult: Client.RsdoctorClientAssetsDiffResult;
}> = ({ assetsDiffResult }) => {
  const dataSource: { type: string; data: BundleDiffTableOverviewData }[] = [
    {
      type: 'JS',
      data: assetsDiffResult.js,
    },
    {
      type: 'CSS',
      data: assetsDiffResult.css,
    },
    {
      type: 'Imgs',
      data: assetsDiffResult.imgs,
    },
    {
      type: 'Fonts',
      data: assetsDiffResult.fonts,
    },
    {
      type: 'Media',
      data: assetsDiffResult.media,
    },
    {
      type: 'HTML',
      data: assetsDiffResult.html,
    },
    {
      type: 'Others',
      data: assetsDiffResult.others,
    },
  ];

  return (
    <Table
      bordered
      pagination={false}
      dataSource={dataSource}
      rowKey={(v) => v.type}
      style={{ marginTop: Size.BasePadding - Size.BasePadding / 4 }}
      columns={[
        {
          title: `File Type`,
          dataIndex: 'type',
          key: 'type',
          render: (v) => <Typography.Text strong>{v}</Typography.Text>,
        },
        {
          title: `Size`,
          dataIndex: 'data',
          key: 'size',
          children: [
            {
              title: 'Current',
              dataIndex: 'data',
              key: 'csize',
              render: (v: BundleDiffTableOverviewData) => {
                const total = (
                  <React.Fragment>
                    <Typography.Text strong>
                      {formatSize(v.total.size.current)}
                    </Typography.Text>
                    <Percent percent={v.total.percent} state={v.total.state} />
                    {formatDiffSize(
                      v.total.size.baseline,
                      v.total.size.current,
                      v.total.state,
                    )}
                  </React.Fragment>
                );

                if (v.initial) {
                  return (
                    <Space direction="vertical">
                      <Space>
                        <Tag color={Color.Blue}>Total</Tag>
                        {total}
                      </Space>
                      <Space>
                        <Tag color={Color.Blue}>Initial</Tag>
                        <Typography.Text strong>
                          {formatSize(v.initial.size.current)}
                        </Typography.Text>
                        <Percent
                          percent={v.initial.percent}
                          state={v.initial.state}
                        />
                        {formatDiffSize(
                          v.initial.size.baseline,
                          v.initial.size.current,
                          v.initial.state,
                        )}
                      </Space>
                    </Space>
                  );
                }

                return <Space>{total}</Space>;
              },
            },
            {
              title: 'Baseline',
              dataIndex: 'data',
              key: 'bsize',
              render: (v: BundleDiffTableOverviewData) => {
                const total = (
                  <Typography.Text>
                    {formatSize(v.total.size.baseline)}
                  </Typography.Text>
                );

                if (v.initial) {
                  return (
                    <Space direction="vertical">
                      <Space>
                        <Tag color={Color.Blue}>Total</Tag>
                        {total}
                      </Space>
                      <Space>
                        <Tag color={Color.Blue}>Initial</Tag>
                        <Typography.Text>
                          {formatSize(v.initial.size.baseline)}
                        </Typography.Text>
                      </Space>
                    </Space>
                  );
                }
                return total;
              },
            },
          ],
        },
        {
          title: `Count`,
          dataIndex: 'data',
          key: 'count',
          children: [
            {
              title: 'Current',
              dataIndex: 'data',
              key: 'ccount',
              render: (v: BundleDiffTableOverviewData) => {
                const total = (
                  <Typography.Text strong>
                    {v.total.count.current}
                  </Typography.Text>
                );

                if (v.initial) {
                  return (
                    <Space direction="vertical">
                      <Space>
                        <Tag color={Color.Blue}>Total</Tag>
                        {total}
                      </Space>
                      <Space>
                        <Tag color={Color.Blue}>Initial</Tag>
                        <Typography.Text strong>
                          {v.initial.count.current}
                        </Typography.Text>
                      </Space>
                    </Space>
                  );
                }

                return <Space>{total}</Space>;
              },
            },
            {
              title: 'Baseline',
              dataIndex: 'data',
              key: 'bcount',
              render: (v: BundleDiffTableOverviewData) => {
                const total = (
                  <Typography.Text>{v.total.count.baseline}</Typography.Text>
                );

                if (v.initial) {
                  return (
                    <Space direction="vertical">
                      <Space>
                        <Tag color={Color.Blue}>Total</Tag>
                        {total}
                      </Space>
                      <Space>
                        <Tag color={Color.Blue}>Initial</Tag>
                        <Typography.Text>
                          {v.initial.count.baseline}
                        </Typography.Text>
                      </Space>
                    </Space>
                  );
                }

                return <Space>{total}</Space>;
              },
            },
          ],
        },
      ]}
    />
  );
};
