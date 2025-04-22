import React, { useMemo, useState } from 'react';
import { Card, Col, Row, Radio } from 'antd';
import { Lodash } from '@rsdoctor/utils/common';
import { FileSearchOutlined } from '@ant-design/icons';
import { SDK } from '@rsdoctor/types';
import path from 'path-browserify';
import {
  ConnectManifestData,
  ServerAPIProvider,
} from 'src/components/Manifest';
import { Size } from '../../constants';
import { FileTree } from '../../components/FileTree';
import { KeywordInput } from '../../components/Form/keyword';
import { getTreeFilesDefaultExpandedKeys, useFileStructures } from './utils';
import {
  fetchManifest,
  useModuleGraphInstanceByModuleGraph,
} from '../../utils';
import { CodeEditor } from './editor';
import { Space } from './space';
import { TreeShakingTable } from './table';
import type { TableKind, SetEditorStatus } from './types';

import './index.sass';
export * from './constants';

const Component: React.FC<{ data: SDK.ModuleGraphData; cwd: string }> = ({
  data,
  cwd,
}) => {
  const moduleGraph = useModuleGraphInstanceByModuleGraph(data);

  if (moduleGraph.size() === 0) {
    return <Space />;
  }

  const [searchInput, setSearchInput] = useState('');
  const [toLine, setToLine] = useState(1);
  const [ranges, setRanges] = useState<SDK.SourceRange[]>([]);
  const [tableKind, setTableKind] = useState<TableKind>('side-effect');
  const filteredModules = useMemo(
    () =>
      moduleGraph
        .getModules()
        .filter(
          (item) =>
            item.kind === SDK.ModuleKind.Normal &&
            path.basename(item.path).includes(searchInput),
        ),
    [searchInput],
  );

  const entry = useMemo(
    () => filteredModules.find((item) => item.isEntry)!,
    [],
  );
  const [selectedModule, setSelectedModule] = useState(
    entry || (filteredModules?.length && filteredModules?.[0]),
  );
  const files = useFileStructures(
    filteredModules,
    moduleGraph,
    searchInput,
    selectedModule,
    (file) => {
      setEditorData(filteredModules.find((item) => item.path === file)!, []);
    },
    cwd,
  );
  const setEditorData: SetEditorStatus = (module, ranges, line) => {
    setSelectedModule(module);
    setRanges(ranges.slice());

    if (Lodash.isNumber(line)) {
      setToLine(line);
    }
  };

  return (
    <Card
      title="Tree Shaking Analysis"
      bodyStyle={{ paddingTop: 0 }}
      className="tree-shaking-page"
    >
      <Row
        justify="space-between"
        align="middle"
        style={{ marginBottom: Size.BasePadding, marginTop: Size.BasePadding }}
      >
        <KeywordInput
          icon={<FileSearchOutlined />}
          width={400}
          label="FileName"
          placeholder="search filename by keyword"
          style={{ width: 'auto' }}
          onChange={(e) => setSearchInput(e)}
        />
        <Radio.Group
          value={tableKind}
          onChange={({ target }) => setTableKind(target.value)}
        >
          <Radio.Button value="side-effect">SideEffects</Radio.Button>
          <Radio.Button value="export">Export Variables</Radio.Button>
        </Radio.Group>
      </Row>
      <Row
        justify="space-between"
        align="top"
        wrap={false}
        gutter={[Size.BasePadding, Size.BasePadding]}
      >
        <Col span={7}>
          <Card
            title={`Total Files: ${filteredModules.length}`}
            className="tree-shaking-files-box"
          >
            <FileTree
              style={{ height: '80%' }}
              className="tree-shaking-files"
              selectedKeys={selectedModule ? [selectedModule.path] : []}
              defaultExpandedKeys={getTreeFilesDefaultExpandedKeys(files)}
              treeData={files}
              expandAction="click"
            />
          </Card>
        </Col>
        <Col span={9}>
          <ServerAPIProvider
            api={SDK.ServerAPI.API.GetModuleCodeByModuleId}
            body={{ moduleId: selectedModule.id }}
          >
            {(source) => {
              return (
                <CodeEditor
                  module={selectedModule}
                  moduleGraph={moduleGraph}
                  ranges={ranges}
                  toLine={toLine}
                  setEditorData={setEditorData}
                  source={source}
                />
              );
            }}
          </ServerAPIProvider>
        </Col>
        <Col flex={1}>
          <TreeShakingTable
            kind={tableKind}
            setEditorData={setEditorData}
            module={selectedModule}
            moduleGraph={moduleGraph}
          />
        </Col>
      </Row>
    </Card>
  );
};

export const TreeShakingPage = ConnectManifestData(
  fetchManifest,
  [
    ['moduleGraph', 'data'],
    ['root', 'cwd'],
  ],
  Component,
);
