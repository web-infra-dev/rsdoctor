import { InfoCircleOutlined, SearchOutlined } from '@ant-design/icons';
import {
  beautifyModulePath,
  formatPercent,
  formatSize,
} from '@rsdoctor/components/utils';
import { Client } from '@rsdoctor/types';
import { Graph } from '@rsdoctor/utils/common';
import {
  Button,
  Divider,
  Input,
  InputRef,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  ColumnGroupType,
  ColumnType,
  FilterConfirmProps,
} from 'antd/es/table/interface';
import { upperFirst } from 'lodash-es';
import React, { useMemo, useRef, useState } from 'react';
import { ViewChanges } from './changes';
import { UpdateType } from './constants';
import { FileUpdateTypeTag, getUpdateType } from './modules';
import {
  BundleDiffComponentCardProps,
  BundleDiffTableAssetsData,
  BundleDiffTableModulesData,
} from './types';
import { formatDiffSize } from './utils';
import { Color } from 'src/constants';

export const ModuleHashPattern = /[a-fA-F0-9]{20,}/;

export const getSizeColumnPropsForModuleRow = (
  key: 'baseline' | 'current',
  sizeKey: 'parsedSize' | 'sourceSize',
): ColumnType<BundleDiffTableModulesData> => {
  return {
    width: 200,
    sorter: (a, b) =>
      (a[key]?.size[sizeKey] || 0) - (b[key]?.size[sizeKey] || 0),
    render: (_v, r) => {
      if (!r[key]) return '-';
      const size = r[key]!.size[sizeKey];
      return (
        <Space>
          <Typography.Text>{formatSize(size)}</Typography.Text>
          {/* {key === 'current' ? <SizePercent baseline={r.baseline?.size[sizeKey] || 0} current={size} /> : null} */}
          {key === 'current'
            ? formatDiffSize(
                r.baseline?.size[sizeKey] || 0,
                size,
                (r.baseline?.size[sizeKey] || 0) > size
                  ? Client.RsdoctorClientDiffState.Down
                  : Client.RsdoctorClientDiffState.Up,
              )
            : null}
        </Space>
      );
    },
  };
};

export const getTargetColumnPropsForModuleRow = (
  key: 'baseline' | 'current',
  bModulesCount: number,
  cModulesCount: number,
): ColumnGroupType<BundleDiffTableModulesData> => {
  const isB = key === 'baseline';
  return {
    title: () => {
      const count = isB ? bModulesCount : cModulesCount;
      const title = upperFirst(key);
      const diff = Graph.diffSize(bModulesCount, cModulesCount);
      return (
        <div>
          <Typography.Text>{title}</Typography.Text>
          <Divider type="vertical" />
          <Tooltip
            title={
              <Space direction="vertical">
                <Typography.Text style={{ color: 'inherit' }}>
                  {title} modules is {count}
                </Typography.Text>
                {isB ? null : (
                  <Typography.Text style={{ color: 'inherit' }}>
                    Percent is {formatPercent(diff.percent)}
                  </Typography.Text>
                )}
              </Space>
            }
          >
            <Space>
              <Typography.Text
                type="secondary"
                style={{ fontSize: 10, fontWeight: 400 }}
              >
                {count}
              </Typography.Text>
              <InfoCircleOutlined />
            </Space>
          </Tooltip>
        </div>
      );
    },
    children: [
      {
        title: 'Source Size',
        ...getSizeColumnPropsForModuleRow(key, 'sourceSize'),
      },
      {
        title: 'Parsed Size',
        defaultSortOrder: isB ? undefined : 'descend',
        ...getSizeColumnPropsForModuleRow(key, 'parsedSize'),
      },
    ],
    filterSearch: true,
    filters: [
      {
        text: 'Show Changed',
        value: UpdateType.NotChanged,
      },
      {
        text: 'Show All',
        value: 'All',
      },
    ],
    onFilter(v, r) {
      return v === UpdateType.NotChanged ? getUpdateType(r) !== v : true;
    },
  };
};

export const ModuleRowForAsset: React.FC<
  { data: BundleDiffTableAssetsData } & Pick<
    BundleDiffComponentCardProps,
    'baseline' | 'current'
  >
> = ({ data, baseline, current }) => {
  const { modules: bTotalModules } = baseline.moduleGraph;
  const { modules: cTotalModules } = current.moduleGraph;
  const { chunks: bToTalChunks } = baseline.chunkGraph;
  const { chunks: cToTalChunks } = current.chunkGraph;
  const bRoot = baseline.root;
  const cRoot = current.root;

  const [searchText, setSearchText] = useState('');
  const searchInput = useRef<InputRef>(null);

  const handleSearch = (
    selectedKeys: string[],
    confirm: (param?: FilterConfirmProps) => void,
  ) => {
    confirm();
    setSearchText(selectedKeys[0]);
  };

  const handleReset = (clearFilters: () => void) => {
    clearFilters();
    setSearchText('');
  };

  const isBaseline = '__is_baseline__' as const;

  const bModules = useMemo(
    () =>
      data.baseline
        ? Graph.getModulesByAsset(data.baseline, bToTalChunks, bTotalModules)
            .map((e) => ({
              ...e,
              [isBaseline]: true,
            }))
            .filter((cModule) => !cModule.concatenationModules?.length)
        : [],
    [data, baseline],
  );
  const cModules = useMemo(
    () =>
      data.current
        ? Graph.getModulesByAsset(data.current, cToTalChunks, cTotalModules)
            .map((e) => ({
              ...e,
              [isBaseline]: false,
            }))
            .filter((cModule) => !cModule.concatenationModules?.length)
        : [],
    [data, current],
  );

  const getPathInfo = (r: BundleDiffTableModulesData) =>
    beautifyModulePath(r.path, r[isBaseline] ? bRoot : cRoot);

  const dataSource: BundleDiffTableModulesData[] = useMemo(() => {
    const mods = [...bModules, ...cModules];
    const map = new Map<string, BundleDiffTableModulesData>();

    // group by module.path
    mods.forEach((mod) => {
      const modPath =
        mod.webpackId?.replace(ModuleHashPattern, '') ||
        mod.path?.replace(ModuleHashPattern, '');
      let t: BundleDiffTableModulesData = map.get(modPath)!;

      if (!t) {
        t = { path: modPath };
      }

      if (mod[isBaseline]) {
        t.baseline = mod;
      } else {
        t.current = mod;
      }
      map.set(modPath, t);
    });

    return [...map.values()];
  }, [bModules, cModules, searchText]);

  const { bModulesCount, cModulesCount, totalCount } = useMemo(() => {
    const fileNameFilter = (e: BundleDiffTableModulesData) =>
      getPathInfo(e).alias.indexOf(searchText) > -1;

    let b = dataSource.filter((e) => e.baseline);
    let c = dataSource.filter((e) => e.current);
    let totalCount = dataSource.length;

    if (searchText) {
      b = b.filter(fileNameFilter);
      c = c.filter(fileNameFilter);
      totalCount = dataSource.filter(fileNameFilter).length;
    }

    return {
      bModulesCount: b.length,
      cModulesCount: c.length,
      totalCount,
    };
  }, [dataSource, searchText]);

  return (
    <Table
      dataSource={dataSource}
      rowKey={(e) => e.path}
      size="small"
      pagination={{
        size: 'small',
      }}
      bordered
      scroll={{ x: 1500 }}
      columns={[
        {
          fixed: 'left',
          title: () => {
            return (
              <div>
                <Typography.Text>
                  Modules of {`"${data.alias}"`}
                </Typography.Text>
                <Divider type="vertical" />
                <Tooltip
                  title={
                    <Space direction="vertical">
                      <Typography.Text style={{ color: 'inherit' }}>
                        filtered modules: {totalCount}
                      </Typography.Text>
                      <Typography.Text style={{ color: 'inherit' }}>
                        total modules: {dataSource.length}
                      </Typography.Text>
                    </Space>
                  }
                >
                  <Typography.Text
                    type="secondary"
                    style={{ fontSize: 10, fontWeight: 400, marginRight: 4 }}
                  >
                    {totalCount}/{dataSource.length}
                  </Typography.Text>
                  <InfoCircleOutlined />
                </Tooltip>
              </div>
            );
          },
          filterDropdown({
            setSelectedKeys,
            selectedKeys,
            confirm,
            clearFilters,
          }) {
            return (
              <div
                style={{ padding: 8 }}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <Input
                  ref={searchInput}
                  placeholder={`Search by file name`}
                  value={selectedKeys[0] as string | number}
                  onChange={(e) =>
                    setSelectedKeys(e.target.value ? [e.target.value] : [])
                  }
                  onPressEnter={() =>
                    handleSearch(selectedKeys as string[], confirm)
                  }
                  style={{ marginBottom: 8, display: 'block' }}
                />
                <Space>
                  <Button
                    type="primary"
                    onClick={() =>
                      handleSearch(selectedKeys as string[], confirm)
                    }
                    icon={<SearchOutlined />}
                    size="small"
                    style={{ width: 90 }}
                  >
                    Search
                  </Button>
                  <Button
                    onClick={() => {
                      clearFilters && handleReset(clearFilters);
                      setSelectedKeys([]);
                      handleSearch([], confirm);
                    }}
                    size="small"
                    style={{ width: 90 }}
                  >
                    Reset
                  </Button>
                </Space>
              </div>
            );
          },
          filterSearch: true,
          filterIcon: (filtered) => (
            <Space>
              <Typography.Text
                type={searchText ? undefined : 'secondary'}
                style={{ fontWeight: 400 }}
              >
                {searchText || 'Search by file name'}
              </Typography.Text>
              <SearchOutlined
                style={{ color: filtered ? Color.Blue : undefined }}
              />
            </Space>
          ),
          onFilterDropdownOpenChange: (visible) => {
            if (visible) {
              setTimeout(() => searchInput.current?.focus(), 100);
            }
          },
          onFilter(v, r) {
            return getPathInfo(r).alias.indexOf(v as string) > -1;
          },
          render: (_v, r) => {
            const { alias, inNodeModules } = getPathInfo(r);
            return (
              <Space>
                <Tooltip title={r.path}>
                  <Typography.Text copyable={{ text: r.path }}>
                    {alias}
                  </Typography.Text>
                </Tooltip>
                {inNodeModules ? <Tag color="warning">node_modules</Tag> : null}
                <FileUpdateTypeTag type={getUpdateType(r)} />
              </Space>
            );
          },
        },
        getTargetColumnPropsForModuleRow(
          'current',
          bModulesCount,
          cModulesCount,
        ),
        getTargetColumnPropsForModuleRow(
          'baseline',
          bModulesCount,
          cModulesCount,
        ),
        {
          title: 'Actions',
          width: 200,
          render: (_v, r) => {
            return (
              <Space direction="vertical" style={{ maxWidth: 170 }}>
                <ViewChanges
                  text="View Changes"
                  file={r.path}
                  data={[
                    {
                      baseline: baseline.moduleCodeMap[r.baseline?.id]?.source,
                      current: current.moduleCodeMap[r.current?.id]?.source,
                      group: 'Source',
                    },
                    {
                      baseline:
                        baseline.moduleCodeMap[r.baseline?.id]?.transformed,
                      current:
                        current.moduleCodeMap[r.current?.id]?.transformed,
                      group: 'Transformed Source',
                    },
                    {
                      baseline:
                        baseline.moduleCodeMap[r.baseline?.id]?.parsedSource,
                      current:
                        current.moduleCodeMap[r.current?.id]?.parsedSource,
                      group: 'Parsed Source',
                    },
                  ]}
                />
              </Space>
            );
          },
        },
      ]}
    />
  );
};
