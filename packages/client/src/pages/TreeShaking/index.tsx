import { SDK } from '@rsdoctor/shared/types';
import { Card, Col, Empty, Row, Table, Typography } from 'antd';
import React, { useState } from 'react';
import path from 'path-browserify';
import { FileSearchOutlined } from '@ant-design/icons';
import { FileTree } from '../../components/FileTree';
import { KeywordInput } from '../../components/Form/keyword';
import { ServerAPIProvider, withManifestData } from '../../components/Manifest';
import { fetchManifest } from '../../utils';
import { CodeViewer } from '../../components/base';
import { Size } from '../../constants';
import { getSideEffectModules, getSideEffectTree } from './side-effects-data';

import './index.scss';
export * from './constants';

function Component({
  data,
  treeShaking,
  cwd,
}: {
  data: SDK.ModuleGraphData;
  treeShaking?: SDK.TreeShakingData;
  cwd: string;
}): React.ReactElement {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number>();
  const [codeIndex, setCodeIndex] = useState(0);
  const filtered = getSideEffectModules(data.modules, treeShaking, search);
  const selected =
    filtered.find((module) => module.id === selectedId) ?? filtered[0];
  const codes = selected ? treeShaking!.sideEffectCodes[selected.id] : [];
  const code = codes[codeIndex] ?? codes[0];

  return (
    <Card
      title="Tree Shaking Analysis"
      bodyStyle={{ paddingTop: 0 }}
      className="tree-shaking-page"
    >
      <Row
        justify="space-between"
        align="middle"
        gutter={[Size.BasePadding, Size.BasePadding]}
        style={{ marginBottom: Size.BasePadding, marginTop: Size.BasePadding }}
      >
        <Col>
          <KeywordInput
            icon={<FileSearchOutlined />}
            width={400}
            label="FileName"
            placeholder="search filename by keyword"
            style={{ width: 'auto' }}
            onChange={(value) => {
              setSearch(value);
              setSelectedId(undefined);
              setCodeIndex(0);
            }}
          />
        </Col>
      </Row>
      {selected ? (
        <Row
          align="top"
          wrap={false}
          gutter={[Size.BasePadding, Size.BasePadding]}
        >
          <Col span={7} style={{ minWidth: 0 }}>
            <Card
              title={`Total Files: ${filtered.length}`}
              className="tree-shaking-files-box"
            >
              <FileTree
                key={search}
                className="tree-shaking-files"
                treeData={getSideEffectTree(filtered, cwd)}
                defaultExpandAll
                selectedKeys={[`module:${selected.id}`]}
                onSelect={(keys) => {
                  const key = String(keys[0] ?? '');
                  if (key.startsWith('module:')) {
                    setSelectedId(Number(key.slice(7)));
                    setCodeIndex(0);
                  }
                }}
              />
            </Card>
          </Col>
          <Col span={9} style={{ minWidth: 0 }}>
            <Card
              title={
                <Typography.Text ellipsis={{ tooltip: selected.path }}>
                  {path.basename(selected.path)}
                </Typography.Text>
              }
              className="tree-shaking-editor"
            >
              <ServerAPIProvider
                key={selected.id}
                api={SDK.ServerAPI.API.GetModuleCodeByModuleId}
                body={{ moduleId: selected.id }}
              >
                {(source) =>
                  source.source || source.parsedSource ? (
                    <CodeViewer
                      key={`${selected.id}:${codeIndex}`}
                      code={source.source || source.parsedSource}
                      filePath={selected.path}
                      defaultLine={code?.startLine}
                      ranges={
                        code
                          ? [{ start: { line: code.startLine, column: 0 } }]
                          : []
                      }
                      style={{ height: 640, minWidth: 0 }}
                    />
                  ) : (
                    <Empty description="Source code is not included in this report." />
                  )
                }
              </ServerAPIProvider>
            </Card>
          </Col>
          <Col span={8} style={{ minWidth: 0 }}>
            <Card
              title={`SideEffects: ${codes.length}`}
              className="tree-shaking-table"
            >
              <Table
                size="small"
                pagination={false}
                scroll={{ y: 640 }}
                rowKey={(_, index) => String(index)}
                dataSource={codes}
                columns={[
                  { title: 'Line', dataIndex: 'startLine', width: 64 },
                  {
                    title: 'Code',
                    dataIndex: 'code',
                    render: (text: string) => (
                      <pre
                        style={{
                          whiteSpace: 'pre-wrap',
                          overflowWrap: 'anywhere',
                          margin: 0,
                        }}
                      >
                        {text}
                      </pre>
                    ),
                  },
                ]}
                onRow={(_, index) => ({
                  onClick: () => setCodeIndex(index ?? 0),
                  style: {
                    cursor: 'pointer',
                    background:
                      index === codeIndex
                        ? 'var(--ant-color-primary-bg)'
                        : undefined,
                  },
                })}
              />
            </Card>
          </Col>
        </Row>
      ) : (
        <Empty
          description={
            search
              ? 'No matching files'
              : 'No side-effect code was recorded for modules in this report.'
          }
        />
      )}
    </Card>
  );
}

export const TreeShakingPage = withManifestData(
  fetchManifest,
  [
    ['moduleGraph', 'data'],
    ['root', 'cwd'],
    ['treeShaking', 'treeShaking'],
  ],
  Component,
);
