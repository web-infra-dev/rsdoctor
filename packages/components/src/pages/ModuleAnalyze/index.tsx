import { LeftSquareOutlined } from '@ant-design/icons';
import { SDK } from '@rsdoctor/types';
import { Card, Col, Row, Select, Space, Typography } from 'antd';
import React, { useState } from 'react';
import { ServerAPIProvider } from 'src/components/Manifest';
import { getShortPath } from 'src/utils';
import { values } from 'lodash-es';
import { ModuleGraphListContext } from '../BundleSize/config';
import { ModuleFilesTree } from './fileTree';
import './index.sass';

export const ModuleAnalyzeComponent: React.FC<{
  modules: SDK.ModuleData[];
  cwd: string;
  moduleId: string | number;
}> = ({ modules, cwd, moduleId }) => {
  const [selectedChunk, setSelectedChunk] = useState('' as string);
  return (
    <ServerAPIProvider api={SDK.ServerAPI.API.GetModuleDetails} body={{ moduleId: +moduleId }}>
      {({ module, dependencies }) => {
        return (
          <ServerAPIProvider api={SDK.ServerAPI.API.GetAllChunkGraph} body={{}}>
            {(chunks) => {
              return (
                <ModuleGraphListContext.Consumer>
                  {({ moduleJumpList, setModuleJumpList }) => {
                    return (
                      <Card
                        title={
                          <Space>
                            <LeftSquareOutlined
                              onClick={() => {
                                const _list = [...moduleJumpList.slice(0, -1)];
                                setModuleJumpList(_list);
                              }}
                            />

                            <Typography.Title code level={5} style={{ marginBottom: 'revert' }}>
                              {`Current Module:  ${getShortPath(module.path)}`}
                            </Typography.Title>
                          </Space>
                        }
                        style={{ height: '100%' }}
                      >
                        <Row justify="start" style={{ marginBottom: 20 }}>
                          <Col>
                            <Select
                              allowClear
                              placeholder="Select Chunk To Filter Modules Links"
                              showSearch
                              style={{ width: 300 }}
                              options={values(chunks).map((e) => ({ label: e.name, value: e.id }))}
                              onChange={(e) => setSelectedChunk(e)}
                            />
                          </Col>
                        </Row>

                        <Row justify="start" align="middle">
                          <Col span={24}>
                            <ModuleFilesTree
                              curModule={module}
                              modules={modules}
                              dependencies={dependencies}
                              cwd={cwd}
                              selectedChunk={selectedChunk}
                            />
                          </Col>
                        </Row>
                      </Card>
                    );
                  }}
                </ModuleGraphListContext.Consumer>
              );
            }}
          </ServerAPIProvider>
        );
      }}
    </ServerAPIProvider>
  );
};
