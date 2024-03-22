import React, { useMemo, useState } from 'react';
import {
  Button,
  Col,
  Divider,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { Graph } from '@rsdoctor/utils/common';
import { flatten, includes, keys, sumBy, values } from 'lodash-es';
import {
  CheckSquareOutlined,
  InfoCircleOutlined,
  MinusSquareOutlined,
  PlusSquareOutlined,
  SortAscendingOutlined,
  FileSearchOutlined,
  AppstoreAddOutlined,
} from '@ant-design/icons';
import { Constants, SDK, Client } from '@rsdoctor/types';
import { BundleDiffTableAssetsData } from './types';
import { formatPercent, formatSize } from '@rsdoctor/components/utils';

import { Percent, SizePercent } from '@rsdoctor/components/elements';
import { KeywordInput } from '@rsdoctor/components';
import { ModuleRowForAsset } from './row';
import { ViewChanges } from './changes';
import { UpdateType, SortType } from './constants';
import { formatDiffSize } from './utils';
import { Color, Size } from 'src/constants';

const fileTypes = {
  JS: [Constants.JSExtension],
  CSS: [Constants.CSSExtension],
  HTML: [Constants.HtmlExtension],
  Imgs: Constants.ImgExtensions,
  Fonts: Constants.FontExtensions,
  Media: Constants.MediaExtensions,
  Others: [],
};

const definedExtensions = flatten(values(fileTypes));

const Name: React.FC<{ data: BundleDiffTableAssetsData }> = ({ data: r }) => {
  const name = (
    <Space>
      <Typography.Text strong>{r.alias}</Typography.Text>
      <Tooltip
        title={
          <Space style={{ color: 'inherit' }} direction="vertical">
            {r.current ? (
              <Typography.Text style={{ color: 'inherit' }}>
                Current realpath: {r.current.path}
              </Typography.Text>
            ) : null}
            {r.baseline ? (
              <Typography.Text style={{ color: 'inherit' }}>
                Baseline realpath: {r.baseline.path}
              </Typography.Text>
            ) : null}
          </Space>
        }
      >
        <InfoCircleOutlined />
      </Tooltip>
    </Space>
  );

  if (r.baseline && !r.current) {
    // deleted
    return (
      <Space>
        <MinusSquareOutlined style={{ color: Color.Red }} />
        {name}
      </Space>
    );
  }

  if (!r.baseline && r.current) {
    // new
    return (
      <Space>
        <PlusSquareOutlined style={{ color: Color.Green }} />
        {name}
      </Space>
    );
  }

  if (r.baseline && r.current) {
    // update
    return (
      <Space>
        <CheckSquareOutlined style={{ color: Color.Yellow }} />
        {name}
      </Space>
    );
  }

  return name;
};

export const Assets: React.FC<{
  outputFilename: string;
  baseline: SDK.ServerAPI.ResponseTypes[SDK.ServerAPI.API.GetBundleDiffSummary];
  current: SDK.ServerAPI.ResponseTypes[SDK.ServerAPI.API.GetBundleDiffSummary];
}> = ({ baseline, current, outputFilename }) => {
  const bOutPutFileName = outputFilename;

  const [keyword, setKeyword] = useState<string>();
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([]);
  const [selectedUpdateTypes, setSelectedUpdateTypes] = useState<UpdateType[]>(
    [],
  );
  const [selectedSortType, setSelectedSortType] = useState<SortType>(
    SortType.Size,
  );
  const [selectedBAsset, setSelectedBAsset] = useState(null);
  const [selectedCAsset, setSelectedCAsset] = useState(null);

  const { assets: bAssets } = baseline.chunkGraph;
  const { assets: cAssets } = current.chunkGraph;

  const dataSource = useMemo(() => {
    const res: Record<string, BundleDiffTableAssetsData> = {};
    if (selectedBAsset && selectedCAsset) {
      res.choose = {
        alias: `${selectedBAsset} \n ${selectedCAsset}`,
        current: cAssets.find((c: SDK.AssetData) => c.path === selectedCAsset),
        baseline: bAssets.find((b: SDK.AssetData) => b.path === selectedBAsset),
      };
      return values(res);
    }

    bAssets.forEach((asset: SDK.AssetData) => {
      const alias = Graph.formatAssetName(asset.path, bOutPutFileName);
      if (!res[alias]) {
        res[alias] = {
          alias,
          baseline: asset,
        };
      } else {
        console.warn('[Baseline Asset Exists]: ', asset, res);
      }
    });

    cAssets.forEach((asset: SDK.AssetData) => {
      const alias = Graph.formatAssetName(asset.path, bOutPutFileName);
      if (!res[alias]) {
        res[alias] = { alias };
      }
      res[alias].current = asset;
    });

    return values(res);
  }, [bAssets, cAssets, selectedBAsset, selectedCAsset]);

  const filteredDataSource = useMemo(() => {
    let list = dataSource.slice();

    if (keyword) {
      list = list.filter((e) => e.alias.indexOf(keyword) > -1);
    }

    if (selectedFileTypes.length) {
      const exts = flatten(
        selectedFileTypes.map((e) => fileTypes[e as keyof typeof fileTypes]),
      );
      const hasOthers = selectedFileTypes.indexOf('Others') > -1;

      list = list.filter((e) => {
        const asset = e.baseline! || e.current!;
        if (Graph.isAssetMatchExtensions(asset, exts)) {
          return true;
        }

        if (hasOthers) {
          return !Graph.isAssetMatchExtensions(asset, definedExtensions);
        }

        return false;
      });
    }

    if (selectedUpdateTypes.length) {
      list = list.filter((e) => {
        if (e.baseline && !e.current) {
          // deleted
          return includes(selectedUpdateTypes, UpdateType.Deleted);
        }

        if (!e.baseline && e.current) {
          // new
          return includes(selectedUpdateTypes, UpdateType.New);
        }

        if (e.baseline && e.current) {
          if (e.baseline.size === e.current.size) {
            // not changed
            return includes(selectedUpdateTypes, UpdateType.NotChanged);
          }
          // changed
          return includes(selectedUpdateTypes, UpdateType.Changed);
        }

        return false;
      });
    }

    if (selectedSortType) {
      if (selectedSortType === SortType.Name) {
        list.sort((a, b) => {
          return a.alias.localeCompare(b.alias);
        });
      } else {
        const { prev, others } = list.reduce(
          (t, c) => {
            if (c.current) {
              if (c.baseline) {
                t.prev.unshift(c);
              } else {
                t.prev.push(c);
              }
            } else {
              t.others.push(c);
            }
            return t;
          },
          {
            prev: [] as BundleDiffTableAssetsData[],
            others: [] as BundleDiffTableAssetsData[],
          },
        );

        list = [
          ...prev.sort((a, b) => {
            if (b.current && a.current) {
              if (selectedSortType === SortType.Delta) {
                const { percent: percentA } = Graph.diffAssetsByExtensions(
                  baseline.chunkGraph,
                  current.chunkGraph,
                  (asset) =>
                    Graph.formatAssetName(asset.path, bOutPutFileName) ===
                    a.alias,
                );
                const { percent: percentB } = Graph.diffAssetsByExtensions(
                  baseline.chunkGraph,
                  current.chunkGraph,
                  (asset) =>
                    Graph.formatAssetName(asset.path, bOutPutFileName) ===
                    b.alias,
                );
                return percentB - percentA;
              }
              return b.current!.size - a.current!.size;
            }
            return -1;
          }),
          ...others,
        ];
      }
    }

    return list;
  }, [
    dataSource,
    keyword,
    selectedFileTypes,
    selectedUpdateTypes,
    selectedSortType,
  ]);

  const cSize = useMemo(
    () =>
      sumBy(filteredDataSource, (e) => (e.current ? e.current.size : 0)) || 0,
    [filteredDataSource],
  );
  const bSize = useMemo(
    () =>
      sumBy(filteredDataSource, (e) => (e.baseline ? e.baseline.size : 0)) || 0,
    [filteredDataSource],
  );

  return (
    <Row gutter={[Size.BasePadding, Size.BasePadding]}>
      <Col span={24}>
        <Space wrap>
          <KeywordInput
            icon={<FileSearchOutlined />}
            label=""
            labelStyle={{ width: 45 }}
            placeholder="Search by file name"
            onChange={(e) => {
              setKeyword(e);
            }}
          />
          <Select
            mode="multiple"
            placeholder="Filter by file type"
            style={{ width: 250 }}
            options={keys(fileTypes).map((e) => ({ label: e, value: e }))}
            allowClear
            onChange={(e) => {
              setSelectedFileTypes(e);
            }}
          />
          <Select
            mode="multiple"
            placeholder="Filter by file changed type"
            style={{ width: 200 }}
            options={values(UpdateType).map((e) => ({ label: e, value: e }))}
            allowClear
            onChange={(e) => {
              setSelectedUpdateTypes(e);
            }}
          />
          <Select
            suffixIcon={<SortAscendingOutlined />}
            // style={{ width: 150 }}
            options={values(SortType).map((e) => ({ label: e, value: e }))}
            value={selectedSortType}
            onChange={(e) => {
              setSelectedSortType(e);
            }}
          />
        </Space>
        <Row style={{ marginTop: 10 }} gutter={[6, 6]}>
          <Col>
            <Button>Select Baseline Asset and Current Asset to Diff </Button>
          </Col>
          <Col>
            <Select
              allowClear
              placeholder="select baseline assets"
              showSearch
              style={{ width: 300 }}
              options={values(baseline.chunkGraph.assets).map((e) => ({
                label: e.path,
                value: e.path,
              }))}
              onChange={(e) => setSelectedBAsset(e)}
            />
          </Col>
          <Col>
            <Select
              allowClear
              placeholder="select current assets"
              showSearch
              style={{ width: 300 }}
              options={values(current.chunkGraph.assets).map((e) => ({
                label: e.path,
                value: e.path,
              }))}
              onChange={(e) => setSelectedCAsset(e)}
            />
          </Col>
        </Row>
      </Col>
      <Col span={24}>
        <Table
          bordered
          sticky={{ offsetHeader: 54 }}
          pagination={{
            pageSize: 20,
            size: 'small',
          }}
          dataSource={filteredDataSource}
          rowKey={(e) => e.alias}
          expandable={{
            expandedRowRender: (r) => {
              return (
                <div style={{ margin: Size.BasePadding / 3 }}>
                  <ModuleRowForAsset
                    data={r}
                    baseline={baseline}
                    current={current}
                  />
                </div>
              );
            },
            columnTitle: (
              <Tooltip
                title="Click to expand row to see the modules which the chunk contains"
                placement="left"
              >
                <AppstoreAddOutlined style={{ cursor: 'pointer' }} />
              </Tooltip>
            ),
          }}
          columns={[
            {
              title: (
                <Tooltip
                  title={
                    <Space direction="vertical">
                      <Typography.Text style={{ color: 'inherit' }}>
                        filtered assets is {filteredDataSource.length}
                      </Typography.Text>
                      <Typography.Text style={{ color: 'inherit' }}>
                        total assets is {dataSource.length}
                      </Typography.Text>
                    </Space>
                  }
                >
                  <Typography.Text strong>Assets</Typography.Text>
                  <Divider type="vertical" />
                  <Typography.Text
                    type="secondary"
                    style={{ fontSize: 10, fontWeight: 400, marginRight: 4 }}
                  >
                    {filteredDataSource.length}/{dataSource.length}
                  </Typography.Text>
                  <InfoCircleOutlined />
                </Tooltip>
              ),
              render: (_v, r) => <Name data={r} />,
            },
            {
              title: () => {
                const cs = formatSize(cSize);
                const diff = Graph.diffSize(bSize, cSize);
                return (
                  <Tooltip
                    title={`Current size is ${cs}, Delta is ${formatPercent(
                      diff.percent,
                    )}`}
                  >
                    <Typography.Text strong>Current</Typography.Text>
                    <Divider type="vertical" />
                    <Typography.Text
                      style={{ fontSize: 10, fontWeight: 400, marginRight: 4 }}
                    >
                      <Typography.Text
                        style={{ fontSize: 'inherit', marginRight: 8 }}
                      >
                        {cs}
                      </Typography.Text>
                      <SizePercent
                        fontSize={'inherit'}
                        baseline={bSize}
                        current={cSize}
                      />
                      {formatDiffSize(
                        bSize,
                        cSize,
                        bSize > cSize
                          ? Client.RsdoctorClientDiffState.Down
                          : Client.RsdoctorClientDiffState.Up,
                        { fontSize: 10, fontWeight: 400, marginLeft: 4 },
                      )}
                    </Typography.Text>
                    <InfoCircleOutlined />
                  </Tooltip>
                );
              },
              render: (_v, r) => {
                if (r.current) {
                  const { percent, state } = Graph.diffAssetsByExtensions(
                    baseline.chunkGraph,
                    current.chunkGraph,
                    (asset) =>
                      Graph.formatAssetName(asset.path, bOutPutFileName) ===
                      r.alias,
                  );
                  const isInitial = Graph.isInitialAsset(
                    r.current,
                    current.chunkGraph.chunks,
                  );
                  return (
                    <Space>
                      <Typography.Text>
                        {formatSize(r.current.size)}
                      </Typography.Text>
                      <Percent percent={percent} state={state} />
                      {isInitial ? <Tag color={Color.Blue}>initial</Tag> : null}
                    </Space>
                  );
                }
                return '-';
              },
            },
            {
              title: () => {
                const bs = formatSize(bSize);
                return (
                  <Tooltip title={`Baseline size is ${bs}`}>
                    <Typography.Text strong>Baseline</Typography.Text>
                    <Divider type="vertical" />
                    <Typography.Text
                      style={{ fontSize: 10, fontWeight: 400, marginRight: 4 }}
                    >
                      {bs}
                    </Typography.Text>
                    <InfoCircleOutlined />
                  </Tooltip>
                );
              },
              render: (_v, r) => {
                if (r.baseline) {
                  const isInitial = Graph.isInitialAsset(
                    r.baseline,
                    baseline.chunkGraph.chunks,
                  );
                  return (
                    <Space>
                      <Typography.Text>
                        {formatSize(r.baseline.size)}
                      </Typography.Text>
                      {isInitial ? <Tag color={Color.Blue}>initial</Tag> : null}
                    </Space>
                  );
                }
                return '-';
              },
            },
            {
              title: 'Actions',
              key: 'actions',
              render: (_v, r) => {
                return (
                  <ViewChanges
                    file={r.alias}
                    data={[
                      {
                        baseline: r.baseline?.content,
                        current: r.current?.content,
                        group: 'assets',
                      },
                    ]}
                  />
                );
              },
            },
          ]}
        />
      </Col>
    </Row>
  );
};
