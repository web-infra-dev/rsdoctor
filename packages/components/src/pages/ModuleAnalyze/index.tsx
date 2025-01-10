import { SDK } from '@rsdoctor/types';
import {
  Badge,
  Card,
  Col,
  Drawer,
  Popover,
  Row,
  Space,
  Tag,
  Typography,
} from 'antd';
import React, { useState } from 'react';
import { ServerAPIProvider } from 'src/components/Manifest';
import { getShortPath } from 'src/utils';
import { ModuleGraphListContext } from '../BundleSize/config';
import { ModuleFilesTree } from './fileTree';
import './index.scss';
import { drawerWidth, TAG_PALLETE } from '../../constants';
import {
  ExpandOutlined,
  LeftSquareOutlined,
  QuestionCircleOutlined,
  RightSquareTwoTone,
} from '@ant-design/icons';
import { t } from 'i18next';

export enum TabList {
  Reasons,
  Dependencies,
}

const tabslist = [
  {
    key: TabList[TabList.Reasons],
    label: TabList[TabList.Reasons],
  },
  {
    key: TabList[TabList.Dependencies],
    label: TabList[TabList.Dependencies],
  },
] as unknown as { key: string; label: string }[];

export const ModuleAnalyzeComponent: React.FC<{
  modules: SDK.ModuleData[];
  cwd: string;
  moduleId: string | number;
  show: boolean;
  setShow: (arg: boolean) => void;
}> = ({ modules, cwd, moduleId, show, setShow }) => {
  const [selectedChunk, _setSelectedChunk] = useState('' as string);
  const [activeTabKey, setActiveTabKey] = useState(TabList[TabList.Reasons]);

  return (
    <ServerAPIProvider
      api={SDK.ServerAPI.API.GetModuleDetails}
      body={{ moduleId: +moduleId }}
    >
      {({ module, dependencies }) => {
        return (
          <Drawer
            title={
              <div className="module-analyze-box">
                <Typography.Text>{module.path}</Typography.Text>
                <Typography.Text
                  style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.45)' }}
                >
                  {`Current Module: ${getShortPath(module.path)}`}
                </Typography.Text>
              </div>
            }
            open={show}
            maskClosable
            width={drawerWidth}
            onClose={() => setShow(false)}
          >
            <ServerAPIProvider
              api={SDK.ServerAPI.API.GetAllChunkGraph}
              body={{}}
            >
              {(_chunks) => {
                return (
                  <ModuleGraphListContext.Consumer>
                    {({ moduleJumpList, setModuleJumpList }) => {
                      return (
                        <Card
                          style={{ minHeight: 400 }}
                          tabList={tabslist}
                          activeTabKey={activeTabKey}
                          tabProps={{
                            size: 'small',
                            style: {
                              fontSize: 12,
                            },
                          }}
                          onTabChange={(k) => setActiveTabKey(k)}
                          styles={{
                            title: { paddingTop: 0 },
                          }}
                          title={
                            <Space style={{ padding: '10px 0px' }}>
                              <LeftSquareOutlined
                                onClick={() => {
                                  const _list = [
                                    ...moduleJumpList.slice(0, -1),
                                  ];
                                  setModuleJumpList(_list);
                                }}
                              />
                              <Typography.Text>
                                Current Module Imported Reasons Tree
                              </Typography.Text>
                              <Popover
                                content={
                                  <div>
                                    <div>
                                      <Badge status="success" text=" " />
                                      <Typography.Text code>
                                        <ExpandOutlined />
                                        {
                                          " Expand the node_modules's modules that was omitted... "
                                        }
                                      </Typography.Text>
                                      <Typography.Text>{`: ${t('Expand Omitted')}`}</Typography.Text>
                                    </div>
                                    <div>
                                      <Badge status="success" text=" " />
                                      <Popover
                                        content="*"
                                        title="Concatenated Module Name"
                                        trigger="hover"
                                      >
                                        <Tag color={TAG_PALLETE.DARK_BLUE}>
                                          {'Concatenated'}
                                        </Tag>
                                      </Popover>
                                      <Typography.Text>{`: ${t('Concatenated Tag')}`}</Typography.Text>
                                    </div>
                                    <div>
                                      <Badge status="success" text=" " />
                                      <RightSquareTwoTone />
                                      <Typography.Text>
                                        {
                                          ': Jump button, click to jump to the Module dependency analysis page of this module.'
                                        }
                                      </Typography.Text>
                                    </div>
                                  </div>
                                }
                                title="Usage"
                              >
                                <QuestionCircleOutlined />
                              </Popover>
                            </Space>
                          }
                        >
                          <Row justify="start" align="middle">
                            <Col span={24}>
                              <ModuleFilesTree
                                curModule={module}
                                modules={modules}
                                dependencies={dependencies}
                                cwd={cwd}
                                selectedChunk={selectedChunk}
                                activeTabKey={activeTabKey}
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
          </Drawer>
        );
      }}
    </ServerAPIProvider>
  );
};
