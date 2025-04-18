/* eslint-disable react/no-unescaped-entities */
import {
  CloseCircleOutlined,
  FileSearchOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { SDK } from '@rsdoctor/types';
import { Resolver } from '@rsdoctor/utils/common';
import { Button, Card, Col, Row, Space, Table, Typography } from 'antd';
import { get, map } from 'lodash-es';
import React, { useMemo, useState } from 'react';
import { Size } from '../../constants';
import { createFileStructures, formatCosts, mapFileKey } from '../../utils';
import { FileTree } from '../FileTree';
import { KeywordInput } from '../Form/keyword';
import { ServerAPIProvider, withServerAPI } from '../Manifest';
import { DiffViewer } from '../base/DiffViewer';

const height = 735;

const ResolverDetailsPanel: React.FC<
  SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetResolverFileDetails>
> = ({ filepath, before, after, resolvers }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <React.Fragment>
      <Col flex={1}>
        <Card title="Resolve Diff Viewer" styles={{ body: { padding: 0 } }}>
          <DiffViewer
            style={{
              borderTopRightRadius: 0,
              borderTopLeftRadius: 0,
              borderBottomRightRadius: 8,
              borderBottomLeftRadius: 8,
              height: height + 50,
            }}
            originalFilePath={filepath}
            original={before}
            modified={after}
          />
        </Card>
      </Col>
      <Col span={collapsed ? 2 : 7}>
        <Card
          title={collapsed ? '...' : 'Resolve Details'}
          extra={
            <Button
              onClick={() => setCollapsed(!collapsed)}
              size="small"
              icon={collapsed ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
            ></Button>
          }
          style={collapsed ? { width: 80 } : undefined}
        >
          {collapsed ? null : (
            <Table
              style={{
                width: '100%',
                height,
                overflowY: 'scroll',
                wordBreak: 'break-all',
              }}
              size="small"
              pagination={false}
              bordered
              rowKey={(e) => e.request}
              columns={[
                {
                  title: 'Source Code',
                  width: 200,
                  render: (_v, r) => (
                    <Typography.Text copyable>
                      <Typography.Text code strong>
                        {r.request}
                      </Typography.Text>
                    </Typography.Text>
                  ),
                },
                {
                  title: 'Duration',
                  width: 80,
                  render: (_v, r) => (
                    <Typography.Text strong>
                      {formatCosts(r.costs)}
                    </Typography.Text>
                  ),
                  sorter: (a, b) => a.costs - b.costs,
                  sortDirections: ['descend', 'ascend'],
                },
                {
                  title: 'Resolve Result',
                  render: (_v, r) => {
                    if (Resolver.isResolveSuccessData(r))
                      return (
                        <Typography.Text copyable>{r.result}</Typography.Text>
                      );
                    return <CloseCircleOutlined style={{ color: '#f50' }} />;
                  },
                },
              ]}
              dataSource={resolvers}
            />
          )}
        </Card>
      </Col>
    </React.Fragment>
  );
};

export const ResolverFiles: React.FC<{
  filename: string;
  cwd: string;
  resolver: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetResolverFileTree>;
}> = (props) => {
  const { resolver, cwd } = props;

  const [filepath, setFilepath] = useState('');

  const inlinedResourcePathKey = '__RESOURCEPATH__';
  const n = '/node_modules/';

  const paths = useMemo(() => {
    return map(resolver, (e) => e.issuerPath).filter(Boolean);
  }, [resolver]);

  const filterPaths = useMemo(() => {
    return paths.filter((e) =>
      props.filename ? e.indexOf(props.filename) > -1 : true,
    );
  }, [props.filename, paths]);

  const allNodeModules =
    filterPaths.length && filterPaths.every((e) => e.indexOf(n) > -1);

  const files = useMemo(() => {
    return createFileStructures({
      files: filterPaths.length ? filterPaths : paths,
      cwd,
      fileTitle(file, basename) {
        return <div onClick={() => setFilepath(file)}>{basename}</div>;
      },
    });
  }, [props.filename]);

  return (
    <Row justify="start" align="top" wrap={false} gutter={Size.BasePadding}>
      <Col span={7}>
        <Card title="Files">
          <FileTree
            style={{ width: '100%', height, overflow: 'scroll' }}
            treeData={files}
            defaultExpandedKeys={mapFileKey(
              files,
              allNodeModules ? 1 : 4,
              allNodeModules
                ? undefined
                : (node) => {
                    const resourcePath: string = get(
                      node,
                      inlinedResourcePathKey,
                    )!;
                    const isNodeModules = resourcePath.indexOf(n) > -1;

                    if (
                      filterPaths.length &&
                      filterPaths.every((e) => e.indexOf(n) > -1)
                    ) {
                      return true;
                    }

                    return !isNodeModules;
                  },
            )}
            key={`tree_${props.filename}`}
          />
        </Card>
      </Col>
      {filepath && (
        <ServerAPIProvider
          api={SDK.ServerAPI.API.GetResolverFileDetails}
          body={{ filepath }}
        >
          {(resolvers) => <ResolverDetailsPanel {...resolvers} />}
        </ServerAPIProvider>
      )}
    </Row>
  );
};

export const ResolverAnalysisBase: React.FC<{
  project: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetProjectInfo>;
}> = ({ project }) => {
  const { root: cwd } = project;
  const [filename, setFilename] = useState('');

  return (
    <div style={{ width: '100%' }}>
      <Space
        style={{ marginTop: Size.BasePadding, marginBottom: Size.BasePadding }}
      >
        <KeywordInput
          icon={<FileSearchOutlined />}
          label="Filename"
          placeholder="search filename by keyword"
          onChange={(e) => setFilename(e)}
        />
      </Space>
      <ServerAPIProvider api={SDK.ServerAPI.API.GetResolverFileTree}>
        {(resolver) => (
          <ResolverFiles filename={filename} resolver={resolver} cwd={cwd} />
        )}
      </ServerAPIProvider>
    </div>
  );
};

export const ResolverAnalysis = withServerAPI({
  api: SDK.ServerAPI.API.GetProjectInfo,
  responsePropName: 'project',
  Component: ResolverAnalysisBase,
});
