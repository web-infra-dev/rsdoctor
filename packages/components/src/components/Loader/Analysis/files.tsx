import { CloseCircleOutlined } from '@ant-design/icons';
import { SDK } from '@rsdoctor/types';
import {
  Card,
  Col,
  Divider,
  Drawer,
  List,
  Popover,
  Row,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { get } from 'lodash-es';
import React, { useMemo, useState } from 'react';
import { drawerWidth, Size } from '../../../constants';
import {
  createFileStructures,
  DataNode,
  filterLoader,
  formatCosts,
  mapFileKey,
} from '../../../utils';
import { FileTree } from '../../FileTree';
import { Keyword } from '../../Keyword';
import { ServerAPIProvider } from '../../Manifest';
import { LoaderExecutions } from '../executions';
import styles from './style.module.scss';

const ADDITION_LOADER_NUMBER = 3;

export const LoaderFiles: React.FC<{
  filetree: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetLoaderFileTree>;
  cwd: string;
  loaders: string[];
  filename: string;
  layer?: string;
}> = (props) => {
  const { cwd, filetree } = props;
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [resourcePath, setResourcePath] = useState('');
  const [loaderIndex, setLoaderIndex] = useState(0);
  const [selectedNode, setSelectedNode] = useState<DataNode | null>(null);

  const maxHeight = 800;

  const filteredFiles = useMemo(
    () =>
      filetree.filter((e) =>
        e.loaders.some((l) =>
          filterLoader(
            e.path,
            l.loader,
            props.filename,
            props.loaders,
            e.layer,
            props?.layer,
          ),
        ),
      ),
    [props.filename, props.loaders, props.layer],
  );

  const inlinedResourcePathKey = '__RESOURCEPATH__';

  const files = useMemo(() => {
    return createFileStructures({
      files: filteredFiles.map((e) => e.path),
      cwd,
      fileTitle(file, basename) {
        const { loaders, layer } = filetree.find((e) => e.path === file)!;

        const additionalLoaders: (Pick<
          SDK.LoaderTransformData,
          'path' | 'loader' | 'errors'
        > & { costs: number })[] = [];

        loaders.forEach(
          (l, i) => i > ADDITION_LOADER_NUMBER && additionalLoaders.push(l),
        );

        return (
          <div
            style={{
              wordBreak: 'break-all',
              display: 'flex',
              cursor: 'pointer',
            }}
            onClick={() => {
              setLoaderIndex(0);
              setResourcePath(file);
              setDrawerVisible(true);
            }}
          >
            <div className={styles.box}>
              <div className={styles.keywords}>
                <Keyword text={basename.replace(/\[.*?\]/g, '')} keyword={''} />
              </div>
            </div>
            <div className={styles.dividerDiv} style={{ flex: 1 }}>
              <Divider className={styles.divider} dashed />
            </div>

            {layer && (
              <Tag color="cyan" bordered={false}>
                {layer}
              </Tag>
            )}
            <Space>
              {loaders.slice(0, ADDITION_LOADER_NUMBER).map((e, i) => {
                const isError = e.errors && e.errors.length;
                const key = `${file}_${e.loader}_${i}`;
                if (i <= ADDITION_LOADER_NUMBER) {
                  return (
                    <Tooltip title={e.path} key={key}>
                      <Typography.Text
                        className={styles.textBox}
                        style={{ color: isError ? '#f50' : 'inherit' }}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setResourcePath(file);
                          setLoaderIndex(i);
                          setDrawerVisible(true);
                        }}
                      >
                        <Typography.Text className={styles.text} ellipsis>
                          {e.loader.match(/([^/]+-loader)/g)?.[0] || e.loader}
                        </Typography.Text>
                        <Divider type="vertical" />
                        {isError ? (
                          <CloseCircleOutlined />
                        ) : (
                          <Typography.Text className={styles.text}>
                            {formatCosts(e.costs)}
                          </Typography.Text>
                        )}
                      </Typography.Text>
                    </Tooltip>
                  );
                }
              })}
              {additionalLoaders?.length ? (
                <Popover
                  content={
                    <List
                      dataSource={additionalLoaders}
                      renderItem={(e, i) => {
                        const isError = e.errors && e.errors.length;
                        const key = `${file}_${e.loader}_${i + ADDITION_LOADER_NUMBER}`;

                        return (
                          <List.Item>
                            <Tooltip title={e.path} key={key}>
                              <div style={{ paddingBottom: 5 }}>
                                <Typography.Text
                                  className={styles.textBox}
                                  style={{
                                    color: isError ? '#f50' : 'inherit',
                                  }}
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    setResourcePath(file);
                                    setLoaderIndex(i);
                                    setDrawerVisible(true);
                                  }}
                                >
                                  <Typography.Text
                                    className={styles.text}
                                    ellipsis
                                  >
                                    {e.loader.match(/([^/]+-loader)/g)?.[0] ||
                                      e.loader}
                                  </Typography.Text>
                                  <Divider type="vertical" />
                                  <Typography.Text className={styles.text}>
                                    {formatCosts(e.costs)}
                                  </Typography.Text>
                                </Typography.Text>
                              </div>
                            </Tooltip>
                          </List.Item>
                        );
                      }}
                    />
                  }
                >
                  <div className={styles.textBox}>
                    <Typography.Text>···</Typography.Text>
                  </div>
                </Popover>
              ) : (
                <></>
              )}
            </Space>
          </div>
        );
      },
      dirTitle(_dir, defaultTitle) {
        return (
          <div style={{ display: 'flex', cursor: 'pointer' }}>
            <Keyword text={defaultTitle} keyword={''} />
          </div>
        );
      },
    });
  }, [filteredFiles]);

  return (
    <Row style={{ width: '100%', marginLeft: 0 }} gutter={Size.BasePadding}>
      <Col span={24}>
        <Card
          title={
            <Space>
              <Typography.Text strong>Files</Typography.Text>
              <Typography.Text
                style={{
                  fontSize: 12,
                  fontWeight: 400,
                  color: '#1C1F2399',
                  opacity: 0.6,
                }}
              >
                Total Files: {filteredFiles.length}
              </Typography.Text>
            </Space>
          }
          bodyStyle={{
            overflow: 'auto',
            maxHeight,
            minHeight: '40rem',
            padding: 14,
          }}
        >
          <FileTree
            defaultExpandedKeys={mapFileKey(
              files,
              filteredFiles.length >= 100 ? 3 : 4,
              (node) => {
                const resourcePath: string = get(node, inlinedResourcePathKey)!;
                const isNodeModules =
                  resourcePath.indexOf('/node_modules/') > -1;

                return !isNodeModules;
              },
            )}
            treeData={files}
            key={`${props.loaders.join('|')}_${props.filename}`}
            onSelect={(_e, info) => {
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
              <ServerAPIProvider
                api={SDK.ServerAPI.API.GetLoaderFileDetails}
                body={{ path: resourcePath }}
              >
                {(data) => (
                  <LoaderExecutions data={data} cwd={cwd} index={loaderIndex} />
                )}
              </ServerAPIProvider>
            ) : null}
          </Drawer>
        </Card>
      </Col>

      <Drawer
        open={!!selectedNode}
        onClose={() => setSelectedNode(null)}
        maskClosable
        width={drawerWidth}
        zIndex={999}
        bodyStyle={{ padding: 0 }}
      >
        {selectedNode && (
          <Row>
            <Col span={24}>
              <Card
                title={
                  <Tooltip
                    title={React.cloneElement(
                      selectedNode.title as React.ReactElement,
                      { style: { color: '#fff' } },
                    )}
                  >
                    <Typography.Text>
                      {`Statistics of`}
                      {selectedNode.title as React.ReactNode}
                    </Typography.Text>
                  </Tooltip>
                }
              >
                <ServerAPIProvider
                  api={SDK.ServerAPI.API.GetLoaderFolderStatistics}
                  body={{ folder: selectedNode[inlinedResourcePathKey] }}
                >
                  {(tableData) => (
                    <Table
                      style={{
                        width: '100%',
                        maxHeight,
                        height: '40rem',
                        overflowY: 'scroll',
                        wordBreak: 'break-all',
                      }}
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
                          render: (v) => (
                            <Typography.Text strong>
                              {formatCosts(v)}
                            </Typography.Text>
                          ),
                          sorter: (a, b) => a.costs - b.costs,
                          defaultSortOrder: 'descend',
                          sortDirections: ['descend', 'ascend'],
                        },
                      ]}
                      dataSource={tableData!}
                    />
                  )}
                </ServerAPIProvider>
              </Card>
            </Col>
          </Row>
        )}
      </Drawer>
    </Row>
  );
};
