import React, { useCallback, useMemo, useRef, useState } from 'react';
import { endsWith, get, sumBy } from 'lodash-es';
import { Card, Col, Descriptions, Divider, Drawer, Row, Space, Table, Tooltip, Typography } from 'antd';
import { CloseCircleOutlined } from '@ant-design/icons';
import { Constants, SDK } from '@rsdoctor/types';
import { ServerAPIProvider } from '../../Manifest';
import { drawerWidth, Size } from '../../../constants';
import { createFileStructures, formatCosts, mapFileKey, DataNode, filterLoader, useMonacoEditor } from '../../../utils';
import { LoaderExecutions } from '../executions';
import { FileTree } from '../../FileTree';
import { Keyword } from '../../Keyword';
import { ECMAVersionDetectTag } from '../../worker/ecmaversion/client';

export const LoaderFiles: React.FC<{
  filetree: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetLoaderFileTree>;
  cwd: string;
  loaders: string[];
  filename: string;
}> = (props) => {
  const { cwd, filetree } = props;
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [resourcePath, setResourcePath] = useState('');
  const [loaderIndex, setLoaderIndex] = useState(0);
  const [selectedNode, setSelectedNode] = useState<DataNode | null>(null);

  const monacoRef = useRef<HTMLElement>(null)
  const { initMonaco } = useMonacoEditor()

  const init = useCallback(async () => {
    await initMonaco(monacoRef);
  }, [])
  
  const maxHeight = 700;

  const filteredFiles = useMemo(
    () => filetree.filter((e) => e.loaders.some((l) => filterLoader(e.path, l.loader, props.filename, props.loaders))),
    [props.filename, props.loaders],
  );

  const inlinedResourcePathKey = '__RESOURCEPATH__';

  const files = useMemo(() => {
    return createFileStructures({
      files: filteredFiles.map((e) => e.path),
      cwd,
      fileTitle(file, basename) {
        const { loaders } = filetree.find((e) => e.path === file)!;
        return (
          <Space
            style={{ wordBreak: 'break-all' }}
            onClick={() => {
              setLoaderIndex(0);
              setResourcePath(file);
              setDrawerVisible(true);
            }}
          >
            <Keyword text={basename} keyword={props.filename} />
            {endsWith(file, Constants.JSExtension) ? (
              <ServerAPIProvider
                api={SDK.ServerAPI.API.GetLoaderFileFirstInput}
                body={{ file }}
                fallbackComponent={() => null}
              >
                {(res) => <ECMAVersionDetectTag code={res} />}
              </ServerAPIProvider>
            ) : null}
            {loaders.map((e, i) => {
              const isError = e.errors && e.errors.length;
              const key = `${file}_${e.loader}_${i}`;
              return (
                <Tooltip title={e.path} key={key}>
                  <Typography.Text
                    code
                    style={{ color: isError ? '#f50' : 'inherit' }}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setResourcePath(file);
                      setLoaderIndex(i);
                      setDrawerVisible(true);
                    }}
                  >
                    <Typography.Text style={{ maxWidth: 135, color: 'inherit' }} ellipsis>
                      {e.loader}
                    </Typography.Text>
                    <Divider type="vertical" />
                    {isError ? (
                      <CloseCircleOutlined />
                    ) : (
                      <Typography.Text strong>{formatCosts(e.costs)}</Typography.Text>
                    )}
                  </Typography.Text>
                </Tooltip>
              );
            })}
          </Space>
        );
      },
      dirTitle(_dir, defaultTitle) {
        return <Keyword text={defaultTitle} keyword={props.filename} />;
      },
    });
  }, [filteredFiles]);

  return (
    <Row style={{ width: '100%' }} gutter={Size.BasePadding}>
      <Col span={14}>
        <Card
          title={<Typography.Text strong>Total Files: {filteredFiles.length}</Typography.Text>}
          bodyStyle={{ overflow: 'scroll', maxHeight }}
        >
          <FileTree
            defaultExpandedKeys={mapFileKey(files, filteredFiles.length >= 100 ? 3 : 4, (node) => {
              const resourcePath: string = get(node, inlinedResourcePathKey)!;
              const isNodeModules = resourcePath.indexOf('/node_modules/') > -1;

              return !isNodeModules;
            })}
            treeData={files}
            key={`${props.loaders.join('|')}_${props.filename}`}
            onSelect={(_e, info) => {
              init();
              if (!info.node.isLeaf) {
                setSelectedNode(info.node);
              }
            }}
            selectedKeys={selectedNode ? [selectedNode.key] : undefined}
            expandAction="click"
          />
          <Drawer
            open={drawerVisible}
            onClose={() => setDrawerVisible(false)}
            maskClosable
            width={drawerWidth}
            zIndex={999}
            bodyStyle={{ padding: 0 }}
          >
            {drawerVisible ? (
              <ServerAPIProvider api={SDK.ServerAPI.API.GetLoaderFileDetails} body={{ path: resourcePath }}>
                {(data) => <LoaderExecutions data={data} cwd={cwd} index={loaderIndex} />}
              </ServerAPIProvider>
            ) : null}
          </Drawer>
        </Card>
      </Col>

      {selectedNode ? (
        <Col span={10}>
          <Card
            title={
              <Tooltip
                title={React.cloneElement(selectedNode.title as React.ReactElement, { style: { color: '#fff' } })}
              >
                <Typography.Text>Statistics of "{selectedNode.title as React.ReactNode}"</Typography.Text>
              </Tooltip>
            }
          >
            <ServerAPIProvider
              api={SDK.ServerAPI.API.GetLoaderFolderStatistics}
              body={{ folder: selectedNode[inlinedResourcePathKey] }}
            >
              {(tableData) => (
                <Table
                  style={{ width: '100%', maxHeight, overflowY: 'scroll', wordBreak: 'break-all' }}
                  pagination={false}
                  bordered
                  rowKey={(e) => e.loader}
                  columns={[
                    {
                      title: 'Loader Name',
                      dataIndex: 'loader',
                    },
                    {
                      title: 'Files',
                      dataIndex: 'files',
                    },
                    {
                      title: 'Total Duration',
                      dataIndex: 'costs',
                      render: (v) => <Typography.Text strong>{formatCosts(v)}</Typography.Text>,
                      sorter: (a, b) => a.costs - b.costs,
                      defaultSortOrder: 'descend',
                      sortDirections: ['descend', 'ascend'],
                    },
                  ]}
                  dataSource={tableData!}
                  footer={() => (
                    <Descriptions title="Total" bordered layout="vertical" size="small">
                      <Descriptions.Item label="loaders">{tableData!.length}</Descriptions.Item>
                      <Descriptions.Item label="files">{sumBy(tableData, (e) => e.files)}</Descriptions.Item>
                      <Descriptions.Item label="duration">
                        <Typography.Text strong>{formatCosts(sumBy(tableData, (e) => e.costs))}</Typography.Text>
                      </Descriptions.Item>
                    </Descriptions>
                  )}
                />
              )}
            </ServerAPIProvider>
          </Card>
        </Col>
      ) : null}
    </Row>
  );
};
