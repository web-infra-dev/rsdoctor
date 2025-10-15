import React, { useMemo, useState } from 'react';
import {
  Col,
  Divider,
  Empty,
  Row,
  Select,
  Space,
  Table,
  Tooltip,
  Typography,
} from 'antd';
import { sumBy, uniq } from 'es-toolkit/compat';
import { SDK } from '@rsdoctor/types';
import { BundleDiffTablePackagesData } from './types';
import { formatSize } from '../../../../utils';
import { Size } from '../../../../constants';
import { FileUpdateTypeTag } from './modules';
import { UpdateType } from './constants';
import { Badge as Bdg } from '../../../../components/Badge';
import { SizePercent } from '../../../../components/Card/diff';

const getChangedType = (data: BundleDiffTablePackagesData): UpdateType => {
  if (data.baseline && data.current) {
    const bvs = data.baseline
      .map((e) => e.version)
      .sort()
      .join();
    const dcs = data.current
      .map((e) => e.version)
      .sort()
      .join();

    return bvs === dcs ? UpdateType.NotChanged : UpdateType.Changed;
  }

  if (!data.baseline && !data.current) {
    return UpdateType.NotChanged;
  }

  if (data.baseline && !data.current) {
    return UpdateType.Deleted;
  }

  return UpdateType.New;
};

const isChanged = (data: BundleDiffTablePackagesData) => {
  return getChangedType(data) !== UpdateType.NotChanged;
};

export const PackagesStatistic: React.FC<{
  dataSource: ReturnType<typeof getPackagesTableDataSource>;
}> = ({ dataSource }) => {
  const { newCount, deleteCount, changedCount } = useMemo(() => {
    return {
      newCount: dataSource.filter((e) => e.updateType === UpdateType.New)
        .length,
      deleteCount: dataSource.filter((e) => e.updateType === UpdateType.Deleted)
        .length,
      changedCount: dataSource.filter(
        (e) => e.updateType === UpdateType.Changed,
      ).length,
    };
  }, [dataSource]);

  return (
    <Space>
      <Bdg
        label="New"
        value={newCount}
        type={newCount > 0 ? 'error' : 'default'}
        tooltip={`Current has ${newCount} packages which not found in Baseline`}
      />
      <Bdg
        label="Deleted"
        value={deleteCount}
        type={deleteCount > 0 ? 'error' : 'default'}
        tooltip={`Current delete ${deleteCount} packages than Baseline`}
      />
      <Bdg
        label="Changed"
        value={changedCount}
        type={changedCount > 0 ? 'error' : 'default'}
        tooltip={`Current has ${changedCount} changed packages than Baseline`}
      />
    </Space>
  );
};

export const getPackagesTableDataSource = ({
  baseline,
  current,
}: {
  baseline: SDK.PackageGraphData;
  current: SDK.PackageGraphData;
}) => {
  const { packages: bPkgs = [] } = baseline || {};
  const { packages: cPkgs = [] } = current || {};

  const res: Record<string, BundleDiffTablePackagesData> = {};

  const setter = (pkg: SDK.PackageData, type: 'baseline' | 'current') => {
    if (!res[pkg.name]) {
      res[pkg.name] = { name: pkg.name, updateType: UpdateType.NotChanged };
    }
    if (!res[pkg.name][type]) {
      res[pkg.name][type] = [];
    }

    res[pkg.name][type]!.push(pkg);
  };

  bPkgs.forEach((e) => setter(e, 'baseline'));
  cPkgs.forEach((e) => setter(e, 'current'));

  const pre: BundleDiffTablePackagesData[] = [];
  const post: BundleDiffTablePackagesData[] = [];

  Object.values(res).forEach((a) => {
    if (isChanged(a)) {
      pre.push(a);
    } else {
      post.push(a);
    }
  });

  return pre.concat(post).map((e) => {
    return {
      ...e,
      updateType: getChangedType(e),
    };
  });
};

export const Packages: React.FC<{
  baseline: SDK.PackageGraphData;
  current: SDK.PackageGraphData;
}> = ({ baseline, current }) => {
  const { packages: bPkgs = [] } = baseline || {};
  const { packages: cPkgs = [] } = current || {};

  if (!bPkgs.length && !cPkgs.length) {
    return <Empty />;
  }

  const pkgNames = useMemo(() => {
    return uniq(bPkgs.concat(cPkgs).map((e) => e.name));
  }, [bPkgs, cPkgs]);

  const [selectedPkgNames, setSelectedPkgNames] = useState<string[]>([]);
  const [selectedUpdateTypes, setSelectedUpdateTypes] = useState<UpdateType[]>(
    [],
  );

  const dataSource = useMemo(() => {
    return getPackagesTableDataSource({ baseline, current });
  }, [baseline, current]);

  const filteredDataSource = useMemo(() => {
    return dataSource.filter((e) => {
      if (selectedUpdateTypes.length) {
        return selectedUpdateTypes.indexOf(e.updateType) > -1;
      }

      if (selectedPkgNames.length) {
        return selectedPkgNames.indexOf(e.name) > -1;
      }

      return true;
    });
  }, [dataSource, selectedPkgNames, selectedUpdateTypes]);

  return (
    <Row gutter={[Size.BasePadding, Size.BasePadding]}>
      <Col span={24} style={{ marginTop: 16 }}>
        <Space wrap>
          <Select
            mode="multiple"
            placeholder="Filter by package names"
            style={{ width: 400 }}
            options={pkgNames.map((e) => {
              const r = dataSource.find((el) => el.name === e);

              if (r && isChanged(r)) {
                return {
                  label: (
                    <Space>
                      <Typography.Text>{e}</Typography.Text>
                      <FileUpdateTypeTag type={getChangedType(r)} />
                    </Space>
                  ),
                  value: e,
                };
              }

              return {
                label: e,
                value: e,
              };
            })}
            allowClear
            onChange={(e) => {
              setSelectedPkgNames(e);
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
          // scroll={{ x: 1700 }}
          dataSource={filteredDataSource}
          rowKey={(e) => e.name}
          columns={[
            {
              title: () => (
                <Space>
                  <Typography.Text>Package Name</Typography.Text>
                  <Divider type="vertical" />
                  <Tooltip
                    title={`Filtered Package Count is ${filteredDataSource.length}, Total Package Count is ${dataSource.length}`}
                  >
                    <Typography.Text
                      type="secondary"
                      style={{ fontSize: 10, fontWeight: 400 }}
                    >
                      {filteredDataSource.length} / {dataSource.length}
                    </Typography.Text>
                  </Tooltip>
                </Space>
              ),
              render: (_v, r) => {
                if (r.updateType !== UpdateType.NotChanged) {
                  return (
                    <Space>
                      <Typography.Text>{r.name}</Typography.Text>
                      <FileUpdateTypeTag type={r.updateType} />
                    </Space>
                  );
                }
                return r.name;
              },
            },
            {
              title: () => {
                return (
                  <Space>
                    <Typography.Text>Current</Typography.Text>
                    <Divider type="vertical" />
                    <PackagesStatistic dataSource={dataSource} />
                  </Space>
                );
              },
              children: [
                {
                  title: 'Version',
                  render: (_v, r) => {
                    if (r.current) {
                      return (
                        <Space direction="vertical">
                          {r.current.map((e) => (
                            <Bdg
                              label="version"
                              value={e.version}
                              tooltip={e.root}
                              key={e.version}
                              type={
                                r.updateType === UpdateType.Deleted
                                  ? 'error'
                                  : r.updateType === UpdateType.Changed
                                    ? 'warn'
                                    : 'default'
                              }
                            />
                          ))}
                        </Space>
                      );
                    }
                    return null;
                  },
                },
                {
                  title: 'Parsed Size',
                  render: (_v, r) => {
                    const parsedSize = sumBy(
                      r.current,
                      (e) => e.size.parsedSize,
                    );
                    const DiffComponent = () => (
                      <SizePercent
                        baseline={sumBy(r.baseline, (e) => e.size.parsedSize)}
                        current={parsedSize}
                      />
                    );

                    if (r.current) {
                      return (
                        <Space>
                          <Typography.Text
                            strong={r.updateType !== UpdateType.NotChanged}
                          >
                            {formatSize(parsedSize)}
                          </Typography.Text>
                          <DiffComponent />
                        </Space>
                      );
                    }
                    return <DiffComponent />;
                  },
                },
              ],
            },
            {
              title: 'Baseline',
              children: [
                {
                  title: 'Version',
                  render: (_v, r) => {
                    if (r.baseline) {
                      return (
                        <Space direction="vertical">
                          {r.baseline.map((e) => (
                            <Bdg
                              label="version"
                              value={e.version}
                              tooltip={e.root}
                              key={e.version}
                              type={
                                r.updateType === UpdateType.Deleted
                                  ? 'error'
                                  : r.updateType === UpdateType.Changed
                                    ? 'warn'
                                    : 'default'
                              }
                            />
                          ))}
                        </Space>
                      );
                    }
                    return null;
                  },
                },
                {
                  title: 'Parsed Size',
                  render: (_v, r) => {
                    if (r.baseline) {
                      const parsedSize = sumBy(
                        r.baseline,
                        (e) => e.size.parsedSize,
                      );
                      return (
                        <Typography.Text>
                          {formatSize(parsedSize)}
                        </Typography.Text>
                      );
                    }
                    return null;
                  },
                },
              ],
            },
          ]}
        />
      </Col>
    </Row>
  );
};
