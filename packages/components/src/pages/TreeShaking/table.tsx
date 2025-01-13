import { SDK } from '@rsdoctor/types';
import {
  Space,
  Table,
  Typography,
  Divider,
  Tooltip,
  Button,
  Input,
  InputRef,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnType, FilterConfirmProps } from 'antd/es/table/interface';
import React, { useMemo, useState, useRef } from 'react';
import Highlighter from 'react-highlight-words';
import { Card } from '../../components/Card';
import type { TableKind, SetEditorStatus } from './types';
import { ellipsisPath } from './utils';
import { isDef } from '../../utils';

const tableHeight = 600;

interface TableProps {
  module: SDK.ModuleInstance;
  moduleGraph: SDK.ModuleGraphInstance;
  setEditorData: SetEditorStatus;
  kind: TableKind;
}

function getDeclarationElement(
  val: SDK.StatementInstance | undefined,
  setEditorData: SetEditorStatus,
) {
  if (!val) {
    return <div>Can not find declaration.</div>;
  }

  const { module } = val;
  const range = module.isPreferSource
    ? val.position.source!
    : val.position.transformed;

  return (
    <Tooltip title={`${module.path}, line ${range.start.line}`}>
      <Button
        type="link"
        onClick={() => setEditorData(module, [range], range.start.line)}
      >
        Move To
      </Button>
    </Tooltip>
  );
}

function useSearchCell<Data>(dataIndex: string): ColumnType<Data> {
  const [searchText, setSearchText] = useState('');
  const [searchedColumn, setSearchedColumn] = useState('');
  const searchInput = useRef<InputRef>(null);

  const handleSearch = (
    selectedKeys: string[],
    confirm: (param?: FilterConfirmProps) => void,
    dataIndex: string,
  ) => {
    confirm();
    setSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };

  const handleReset = (clearFilters: () => void) => {
    clearFilters();
    setSearchText('');
  };

  return {
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
      close,
    }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) =>
            setSelectedKeys(e.target.value ? [e.target.value] : [])
          }
          onPressEnter={() =>
            handleSearch(selectedKeys as string[], confirm, dataIndex)
          }
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() =>
              handleSearch(selectedKeys as string[], confirm, dataIndex)
            }
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Search
          </Button>
          <Button
            onClick={() => clearFilters && handleReset(clearFilters)}
            size="small"
            style={{ width: 90 }}
          >
            Reset
          </Button>
          <Button type="link" size="small" onClick={close}>
            close
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
    ),
    onFilter: (value, record): boolean => {
      // @ts-ignore
      return record[dataIndex]
        .toString()
        .toLowerCase()
        .includes((value as string).toLowerCase());
    },
    render: (text: string) => {
      return searchedColumn === dataIndex ? (
        <Highlighter
          highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
          searchWords={[searchText]}
          autoEscape
          textToHighlight={text ? text.toString() : ''}
        />
      ) : (
        text
      );
    },
  };
}

export const SideEffectTable: React.FC<TableProps> = ({
  module,
  moduleGraph,
  setEditorData,
}) => {
  interface SideEffectDataRowData {
    key: number;
    name: string;
    identifier: SDK.SourceRange;
    declaration?: SDK.StatementInstance;
    children?: SideEffectDataRowData[];
  }

  const sideEffects = useMemo(
    () => moduleGraph.getModuleGraphModule(module)!.getSideEffects(),
    [module],
  );
  const dataSource = sideEffects
    .map(({ variable, name, identifier }, i): SideEffectDataRowData => {
      return {
        key: i,
        name,
        identifier: module.isPreferSource
          ? identifier.position.source!
          : identifier.position.transformed,
        declaration: variable?.identifier,
      };
    })
    .sort((pre, next) => {
      // 名称相同则看行数
      if (pre.name === next.name) {
        return pre.identifier.start.line! > next.identifier.start.line!
          ? 1
          : -1;
      }

      // 名称不同则比较名称
      return pre.name > next.name ? 1 : -1;
    })
    .reduce((ans, item) => {
      const lastItem = ans[ans.length - 1];

      if (!lastItem || lastItem.name !== item.name) {
        ans.push(item);
        return ans;
      }

      if (!lastItem.children) {
        lastItem.children = [];
      }

      lastItem.children.push(item);
      return ans;
    }, [] as SideEffectDataRowData[]);

  const columns: ColumnType<any>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      align: 'center',
      ...useSearchCell<SDK.ExportData>('name'),
    },
    {
      title: 'SideEffect',
      dataIndex: 'identifier',
      key: 'identifier',
      align: 'center',
      render: (val: SDK.SourceRange) => {
        return (
          <Tooltip title={`Current File line ${val.start.line}`}>
            <Button
              type="link"
              onClick={() => setEditorData(module, [val], val.start.line)}
            >
              Move To
            </Button>
          </Tooltip>
        );
      },
    },
    {
      title: 'Declaration',
      dataIndex: 'declaration',
      key: 'declaration',
      align: 'center',
      render: (val: SDK.StatementInstance) => {
        return getDeclarationElement(val, setEditorData);
      },
    },
  ];

  const titleInfo = (
    <React.Fragment>
      <Space style={{ fontWeight: 400 }}>
        Import
        <Typography.Text strong>{dataSource.length}</Typography.Text>
        variables
        <Divider type="vertical" />
        <Typography.Text strong>{sideEffects.length}</Typography.Text>
        sideEffects
      </Space>
    </React.Fragment>
  );

  return (
    <Card
      style={{ marginBottom: 10 }}
      title={titleInfo}
      className="tree-shaking-export-table"
    >
      <Table
        size="small"
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        scroll={{ y: tableHeight }}
      />
    </Card>
  );
};

export const ExportTable: React.FC<TableProps> = ({
  module,
  moduleGraph,
  setEditorData,
}) => {
  const exportsData = useMemo(
    () => moduleGraph.getModuleGraphModule(module)!.getExports(),
    [module],
  );
  const allUnUsedExports = exportsData.filter(
    (item) => item.getSideEffects().length === 0,
  );
  const titleInfo = (
    <React.Fragment>
      <Space style={{ fontWeight: 400 }}>
        Export
        <Typography.Text strong>{exportsData.length}</Typography.Text>
      </Space>
      {exportsData.length > 0 ? (
        <>
          <Divider type="vertical" />
          <Typography.Text style={{ fontWeight: 400 }} code>
            <Typography.Text>Unused</Typography.Text>
            <Divider type="vertical" />
            <Typography.Text strong>{allUnUsedExports.length}</Typography.Text>
          </Typography.Text>
          <Divider type="vertical" />
          <Typography.Text style={{ fontWeight: 400 }} code>
            <Typography.Text>Used</Typography.Text>
            <Divider type="vertical" />
            <Typography.Text strong>
              {exportsData.length - allUnUsedExports.length}
            </Typography.Text>
          </Typography.Text>
        </>
      ) : (
        ''
      )}
    </React.Fragment>
  );

  interface RowData {
    key: number;
    name: string;
    declaration?: SDK.StatementInstance;
    used: {
      module: SDK.ModuleInstance;
      range: SDK.SourceRange;
    }[];
  }

  const dataSource: RowData[] = exportsData.map((item, i) => {
    const { variable } = item;

    return {
      key: i,
      name: item.name,
      declaration: variable?.identifier,
      used: item
        .getSideEffects()
        .map(({ module, identifier }) => {
          const range = module?.isPreferSource
            ? identifier.position.source
            : identifier.position.transformed;

          if (!module || !range) {
            return;
          }

          return {
            module,
            range,
          };
        })
        .filter(isDef),
    };
  });

  const columns: ColumnType<any>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      align: 'center',
      ...useSearchCell<SDK.ExportInstance>('name'),
    },
    {
      title: 'Declaration',
      dataIndex: 'declaration',
      key: 'declaration',
      align: 'center',
      render: (val?: SDK.StatementInstance) => {
        return getDeclarationElement(val, setEditorData);
      },
    },
    {
      title: 'Info',
      dataIndex: 'used',
      key: 'used',
      align: 'center',
      sorter: (a: RowData, b: RowData) => a.used.length - b.used.length,
      sortDirections: ['descend', 'ascend'],
      render: (val: RowData['used']) => <span>Used {val.length} times</span>,
    },
  ];

  const expandElement = (data: any) => {
    return (
      <div className="tree-shaking-side-effect-list">
        <Typography.Text>List of SideEffect:</Typography.Text>
        {data.used.map(({ module, range }: any) => (
          <Tooltip key={module.id} title={`${module.path}:${range.start.line}`}>
            <Button
              className="tree-shaking-side-effect-list-item"
              type="link"
              onClick={() => {
                setEditorData(module, [range], range.start.line);
              }}
            >
              {`${ellipsisPath(module.path)}:${range.start.line}`}
            </Button>
          </Tooltip>
        ))}
      </div>
    );
  };

  return (
    <Card title={titleInfo} className="tree-shaking-export-table">
      <Table
        size="small"
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        scroll={{ y: tableHeight }}
        expandable={{
          expandedRowRender: expandElement,
          rowExpandable: (val: any) => val.used.length > 0,
        }}
      />
    </Card>
  );
};

export const TreeShakingTable: React.FC<TableProps> = (props) => {
  return props.kind === 'side-effect' ? (
    <SideEffectTable {...props} />
  ) : (
    <ExportTable {...props} />
  );
};
