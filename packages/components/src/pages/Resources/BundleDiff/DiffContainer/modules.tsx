import React, { useMemo, useState } from 'react';
import {
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
import { uniq } from 'es-toolkit/compat';
import { InfoCircleOutlined, FileSearchOutlined } from '@ant-design/icons';
import {
  BundleDiffComponentCardProps,
  BundleDiffTableModulesData,
} from './types';
import { beautifyModulePath, useUniqModules } from '../../../../utils';
import { Size } from '../../../../constants';
import { KeywordInput } from '../../../../components/Form/keyword';
import { ViewChanges } from './changes';
import { UpdateType } from './constants';
import { Badge as Bdg } from '../../../../components/Badge';
import { ModuleHashPattern, getTargetColumnPropsForModuleRow } from './row';
import { Graph } from '@rsdoctor/utils/common';

export function getUpdateType(e: BundleDiffTableModulesData): UpdateType {
  if (e.baseline && !e.current) {
    // deleted
    return UpdateType.Deleted;
  }

  if (!e.baseline && e.current) {
    // new
    return UpdateType.New;
  }

  if (e.baseline && e.current) {
    if (
      e.baseline.size.sourceSize === e.current.size.sourceSize &&
      e.baseline.size.parsedSize === e.current.size.parsedSize
    ) {
      // not changed
      return UpdateType.NotChanged;
    }
    // update
    return UpdateType.Changed;
  }

  throw new Error('Update Type not match');
}

export const FileUpdateTypeTag: React.FC<{ type: UpdateType }> = ({ type }) => {
  if (type === UpdateType.NotChanged) {
    return (
      <Tooltip title="It hasn't changed between Baseline and Current">
        <Tag color="success">Not Changed</Tag>
      </Tooltip>
    );
  }
  if (type === UpdateType.Changed) {
    return (
      <Tooltip title="It has been changed between Baseline and Current">
        <Tag color="warning">Changed</Tag>
      </Tooltip>
    );
  }
  if (type === UpdateType.New) {
    return (
      <Tooltip title="It is created in Current">
        <Tag color="error">New</Tag>
      </Tooltip>
    );
  }
  if (type === UpdateType.Deleted) {
    return (
      <Tooltip title="It has been deleted in Current">
        <Tag color="error">Deleted</Tag>
      </Tooltip>
    );
  }
  return null;
};

export const Modules: React.FC<BundleDiffComponentCardProps> = ({
  baseline,
  current,
}) => {
  const bModules = useMemo(
    () => useUniqModules(baseline.moduleGraph.modules),
    [baseline],
  );
  const cModules = useMemo(
    () => useUniqModules(current.moduleGraph.modules),
    [current],
  );

  const bChunks = baseline.chunkGraph.chunks;
  const cChunks = current.chunkGraph.chunks;

  const bRoot = baseline.root;
  const cRoot = current.root;

  const [keyword, setKeyword] = useState<string>();
  const [selectedUpdateTypes, setSelectedUpdateTypes] = useState<UpdateType[]>(
    [],
  );

  const dataSource = useMemo(() => {
    const res: Record<string, BundleDiffTableModulesData> = {};

    bModules.forEach((mod) => {
      const modPath =
        mod.webpackId?.replace(ModuleHashPattern, '') ||
        mod.path?.replace(ModuleHashPattern, '');

      if (!res[modPath]) {
        res[modPath] = {
          path: modPath,
          baseline: mod,
        };
      } else {
        console.warn('[Baseline Module Exists]: ', mod, res);
      }
    });

    cModules.forEach((mod) => {
      const modPath =
        mod.webpackId?.replace(ModuleHashPattern, '') ||
        mod.path?.replace(ModuleHashPattern, '');

      if (!res[modPath]) {
        res[modPath] = {
          path: modPath,
        };
      }
      res[modPath].current = mod;
    });

    return Object.values(res);
  }, [bModules, cModules]);

  const filteredDataSource = useMemo(() => {
    let list = dataSource.slice();

    if (keyword) {
      list = list.filter((e) => e.path.indexOf(keyword) > -1);
    }

    if (selectedUpdateTypes.length) {
      list = list.filter((e) => {
        return selectedUpdateTypes.includes(getUpdateType(e));
      });
    }

    return list;
  }, [dataSource, keyword, selectedUpdateTypes]);

  const { bFilteredModulesLength, cFilteredModulesLength } = useMemo(() => {
    return {
      bFilteredModulesLength: filteredDataSource.filter((e) => e.baseline)
        .length,
      cFilteredModulesLength: filteredDataSource.filter((e) => e.current)
        .length,
    };
  }, [filteredDataSource]);

  return (
    <Row gutter={[Size.BasePadding, Size.BasePadding]}>
      <Col span={24}>
        <Space wrap>
          <KeywordInput
            icon={<FileSearchOutlined />}
            label=""
            labelStyle={{ width: 45 }}
            placeholder="Search by name"
            onChange={(e) => {
              setKeyword(e);
            }}
          />
          <Select
            mode="multiple"
            placeholder="Filter by changed type"
            style={{ width: 200 }}
            options={Object.values(UpdateType).map((e) => ({
              label: e,
              value: e,
            }))}
            allowClear
            onChange={(e) => {
              setSelectedUpdateTypes(e);
            }}
          />
        </Space>
      </Col>
      <Col span={24}>
        <Table
          bordered
          sticky={{ offsetHeader: 54 }}
          pagination={{
            pageSize: 20,
            size: 'small',
          }}
          scroll={{ x: 1700 }}
          dataSource={filteredDataSource}
          rowKey={(e) => e.path}
          columns={[
            {
              fixed: 'left',
              title: (
                <Tooltip
                  title={
                    <Space direction="vertical">
                      <Typography.Text style={{ color: 'inherit' }}>
                        filtered modules is {filteredDataSource.length} (Current
                        & Baseline)
                      </Typography.Text>
                      <Typography.Text style={{ color: 'inherit' }}>
                        total modules is {dataSource.length} (Current &
                        Baseline)
                      </Typography.Text>
                    </Space>
                  }
                >
                  <Typography.Text strong>Modules</Typography.Text>
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
              render: (_v, r) => {
                const { alias, inNodeModules } = beautifyModulePath(
                  r.path,
                  r.baseline ? bRoot : cRoot,
                );
                return (
                  <Space>
                    <Tooltip title={r.path}>
                      <Typography.Text copyable={{ text: r.path }}>
                        {alias}
                      </Typography.Text>
                    </Tooltip>
                    <FileUpdateTypeTag type={getUpdateType(r)} />
                    {inNodeModules ? (
                      <Tag color="warning">node_modules</Tag>
                    ) : null}
                  </Space>
                );
              },
            },
            getTargetColumnPropsForModuleRow(
              'current',
              bFilteredModulesLength,
              cFilteredModulesLength,
            ),
            getTargetColumnPropsForModuleRow(
              'baseline',
              bFilteredModulesLength,
              cFilteredModulesLength,
            ),
            {
              title: 'in Assets',
              render: (_v, r) => {
                const b: string[] = [];
                const c: string[] = [];
                if (r.current) {
                  Graph.getChunksByModule(r.current, cChunks).forEach((e) =>
                    e.assets.forEach((asset) => c.push(asset)),
                  );
                }

                if (r.baseline) {
                  Graph.getChunksByModule(r.baseline, bChunks).forEach((e) =>
                    e.assets.forEach((asset) => b.push(asset)),
                  );
                }

                if (!b.length && !c.length) return null;

                return (
                  <Space direction="vertical">
                    {uniq(c)
                      .filter(Boolean)
                      .map((e) => (
                        <Bdg label="Current" value={e} key={`c_${e}`} />
                      ))}
                    {uniq(b)
                      .filter(Boolean)
                      .map((e) => (
                        <Bdg label="Baseline" value={e} key={`b_${e}`} />
                      ))}
                  </Space>
                );
              },
            },
            {
              title: 'Actions',
              width: 200,
              render: (_v, r) => {
                const isChanged = getUpdateType(r) === UpdateType.Changed;
                return (
                  <Space direction="vertical" style={{ maxWidth: 170 }}>
                    {isChanged ? (
                      <ViewChanges
                        text="View Changes"
                        file={r.path}
                        data={[
                          {
                            baseline:
                              baseline.moduleCodeMap[r.baseline?.id as number]
                                ?.source,
                            current:
                              current.moduleCodeMap[r.current?.id as number]
                                ?.source,
                            group: 'Source',
                          },
                          {
                            baseline:
                              baseline.moduleCodeMap[r.baseline?.id as number]
                                ?.transformed,
                            current:
                              current.moduleCodeMap[r.current?.id as number]
                                ?.transformed,
                            group: 'Transformed Source',
                          },
                          {
                            baseline:
                              baseline.moduleCodeMap[r.baseline?.id as number]
                                ?.parsedSource,
                            current:
                              current.moduleCodeMap[r.current?.id as number]
                                ?.parsedSource,
                            group: 'Parsed Source',
                          },
                        ]}
                      />
                    ) : null}
                    {r?.current ? (
                      <ViewChanges
                        text="Current Result Viewer"
                        file={r.path}
                        data={[
                          {
                            baseline:
                              current.moduleCodeMap[r.current!.id]?.source,
                            current:
                              current.moduleCodeMap[r.current!.id]?.transformed,
                            baselineTitle: 'Current Source',
                            currentTitle: 'Current Transformed Source',
                            group: 'Transformed Source',
                          },
                          {
                            baseline:
                              current.moduleCodeMap[r.current!.id]?.source,
                            current:
                              current.moduleCodeMap[r.current!.id]
                                ?.parsedSource,
                            baselineTitle: 'Current Source',
                            currentTitle: 'Current Parsed Source',
                            group: 'Parsed Source',
                          },
                        ]}
                      />
                    ) : null}
                  </Space>
                );
              },
            },
          ]}
        />
      </Col>
    </Row>
  );
};
