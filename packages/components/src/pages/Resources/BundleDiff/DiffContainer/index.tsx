import {
  Button,
  Card,
  Divider,
  FloatButton,
  Popconfirm,
  Space,
  Tabs,
  Tooltip,
  Typography,
} from 'antd';
import React, { useEffect } from 'react';

import { InfoCircleOutlined, LogoutOutlined } from '@ant-design/icons';
import { SDK } from '@rsdoctor/types';
import { BundleDiffContainerProps } from './types';
import { Size } from '../../../../constants';
import { DiffCards } from './cards';
import { Overview } from './overview';
import { Assets } from './assets';
import { Modules } from './modules';
import { Packages } from './packages';
import { DiffServerAPIProvider } from '../DiffServerAPIProvider';
import { Graph } from '@rsdoctor/utils/common';

export const DiffContainer: React.FC<BundleDiffContainerProps> = ({
  manifests,
}) => {
  useEffect(() => {
    console.log('BundleDiff Manifests: ', manifests);
  }, [manifests]);

  return (
    <DiffServerAPIProvider
      api={SDK.ServerAPI.API.GetBundleDiffSummary}
      manifests={manifests}
    >
      {(baselineSummary, currentSummary) => {
        const onlyBaseline =
          baselineSummary.chunkGraph === currentSummary.chunkGraph;

        const baselineChunkGraph = baselineSummary.chunkGraph;
        const currentChunkGraph = onlyBaseline
          ? baselineChunkGraph
          : currentSummary.chunkGraph;

        const assetsDiffResult = Graph.getAssetsDiffResult(
          baselineChunkGraph,
          currentChunkGraph,
        );

        return (
          <div>
            <FloatButton.Group>
              <Tooltip
                placement="leftBottom"
                title={
                  <Space direction="vertical">
                    {[
                      { title: 'Baseline', data: baselineSummary },
                      { title: 'Current', data: currentSummary },
                    ].map(({ title, data }) => {
                      return (
                        <Card size="small" key={title}>
                          <Space direction="vertical">
                            <Typography.Text strong>{title}</Typography.Text>
                            <Space style={{ fontSize: 10 }}>
                              <Typography.Text
                                style={{
                                  fontSize: 'inherit',
                                  width: 30,
                                  display: 'inline-block',
                                }}
                              >
                                Hash
                              </Typography.Text>
                              <Divider type="vertical" />
                              <Typography.Text
                                type="secondary"
                                style={{ fontSize: 'inherit' }}
                              >
                                {data.hash || '-'}
                              </Typography.Text>
                            </Space>
                            {data.cloudManifestUrl ? (
                              <Button
                                type="link"
                                size="small"
                                style={{ padding: 0, fontSize: 10 }}
                                onClick={() =>
                                  window.open(data.cloudManifestUrl)
                                }
                              >
                                Open File
                              </Button>
                            ) : null}
                          </Space>
                        </Card>
                      );
                    })}
                  </Space>
                }
              >
                <FloatButton icon={<InfoCircleOutlined />} />
              </Tooltip>
              <Popconfirm
                title={
                  <Typography.Text>
                    Are you sure to
                    <Typography.Text strong> re-upload </Typography.Text>
                    json files for bundle diff?
                  </Typography.Text>
                }
                onConfirm={() => {}}
                okText="Yes"
                cancelText="Cancel"
                placement="topLeft"
                trigger="hover"
              >
                <FloatButton icon={<LogoutOutlined />} />
              </Popconfirm>
              <FloatButton.BackTop />
            </FloatButton.Group>
            <DiffCards
              baseline={baselineSummary}
              current={currentSummary}
              onlyBaseline={onlyBaseline}
              assetsDiffResult={assetsDiffResult}
            />
            <Tabs
              defaultActiveKey="Overview"
              tabBarStyle={{ marginBottom: Size.BasePadding / 3 }}
              items={[
                {
                  label: 'Overview',
                  key: 'Overview',
                  children: <Overview assetsDiffResult={assetsDiffResult} />,
                },
                {
                  label: 'Assets',
                  key: 'Assets',
                  children: (
                    <Assets
                      outputFilename={baselineSummary.outputFilename}
                      baseline={baselineSummary}
                      current={currentSummary}
                    />
                  ),
                },
                {
                  label: 'Modules',
                  key: 'Modules',
                  children: (
                    <Modules
                      baseline={baselineSummary}
                      current={currentSummary}
                      onlyBaseline={onlyBaseline}
                      assetsDiffResult={assetsDiffResult}
                    />
                  ),
                },
                {
                  label: 'Packages',
                  key: 'Packages',
                  children: (
                    <Packages
                      baseline={baselineSummary.packageGraph}
                      current={currentSummary.packageGraph}
                    />
                  ),
                },
              ].map((el) => ({
                ...el,
                label: <Typography.Text strong>{el.label}</Typography.Text>,
              }))}
            />
          </div>
        );
      }}
    </DiffServerAPIProvider>
  );
};
