import {
  ExpandOutlined,
  InfoCircleOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  RightSquareTwoTone,
} from '@ant-design/icons';
import { SDK } from '@rsdoctor/types';
import {
  Badge,
  Button,
  Col,
  Empty,
  Popover,
  Radio,
  Row,
  Tag,
  Typography,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { ServerAPIProvider } from 'src/components/Manifest';
import { Title } from 'src/components/Title';
import { Size, TAG_PALLETE } from 'src/constants';
import { useI18n } from 'src/utils/hooks';
import { ChunksTable } from './chunks';
import { FileTree } from './components/fileTreeCom';
import { clsNamePrefix } from './constants';
import DependencyTree from './dependency';
import { getImporteds, getModuleReasonsTree } from './utils';
import { useCreateFileTreeData } from './utils/hooks';

enum ChartDimension {
  Dependencies,
  Chunks,
}

export const ModuleFilesTree: React.FC<{
  modules: SDK.ModuleData[];
  dependencies: SDK.DependencyData[];
  curModule: SDK.ModuleData;
  cwd: string;
  selectedChunk: string;
}> = (props) => {
  const { curModule, modules, dependencies, cwd, selectedChunk = '' } = props;
  const { t } = useI18n();
  const [importedModules, setImportedModules] = useState(
    [] as SDK.ModuleData[],
  );
  const [dimension, setDimension] = useState<ChartDimension>(
    ChartDimension.Dependencies,
  );
  const [fold, setFold] = useState(true);
  const { data: fileStructures } = useCreateFileTreeData(
    modules,
    importedModules,
    curModule,
  );
  const [reasonsTree, setReasonsTree] = useState(
    {} as Record<string, string[]>,
  );

  useEffect(() => {
    const importeds = getImporteds(curModule, modules);
    setImportedModules(importeds);
  }, [curModule, modules]);

  useEffect(() => {
    const _reasonsTree: Record<string, string[]> = {};
    importedModules.forEach((_curModule) => {
      const treeList: string[] = [];
      const visited = new Map();
      getModuleReasonsTree(_curModule, modules, treeList, visited);
      _reasonsTree[_curModule.id] = treeList;
    });
    setReasonsTree(_reasonsTree);
  }, [importedModules]);

  return (
    <>
      <Row>
        <Popover
          content={
            <div>
              <div>
                <Badge status="success" text=" " />
                <Typography.Text code>
                  <ExpandOutlined />
                  {" Expand the node_modules's modules that was omitted... "}
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
                  <Tag color={TAG_PALLETE.DARK_BLUE}>{'Concatenated'}</Tag>
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
          <Button type="primary" icon={<InfoCircleOutlined />}>
            Usage
          </Button>
        </Popover>
      </Row>
      <Row gutter={4} style={{ marginTop: Size.BasePadding }}>
        <Col span={fold ? 18 : 12}>
          <Row className={`${clsNamePrefix}-file-tree`} justify={'center'}>
            <Col span={24} style={{ padding: Size.BasePadding / 2 }}>
              <Title text={'Current Module Imported Reasons Tree:'} />
              {importedModules ? (
                <FileTree
                  cwd={cwd}
                  treeData={
                    selectedChunk
                      ? fileStructures.filter(
                          (_parent) =>
                            reasonsTree[_parent.id].indexOf(selectedChunk) >= 0,
                        )
                      : fileStructures
                  }
                  needCode={true}
                  needShowAllTree={true}
                  needJumpto={true}
                  selectedChunk={selectedChunk}
                />
              ) : (
                <Empty className={`${clsNamePrefix}-empty`} />
              )}
            </Col>
          </Row>
        </Col>
        <Col span={fold ? 6 : 12}>
          <div
            className={`${clsNamePrefix}-file-tree`}
            style={{ padding: Size.BasePadding / 2 }}
          >
            {fold ? (
              <Popover content={'Unfold [Dependencies & Chunks] Box.'}>
                <MenuFoldOutlined
                  onClick={() => setFold(!fold)}
                  style={{ marginRight: 8 }}
                />
              </Popover>
            ) : (
              <Popover content={'Fold [Dependencies & Chunks] Box.'}>
                <MenuUnfoldOutlined
                  onClick={() => setFold(!fold)}
                  style={{ marginRight: 8 }}
                />
              </Popover>
            )}

            <Radio.Group
              options={[
                {
                  label: 'Dependencies',
                  value: ChartDimension.Dependencies,
                },
                {
                  label: 'Chunks',
                  value: ChartDimension.Chunks,
                },
              ]}
              onChange={(e) => setDimension(e.target.value)}
              value={dimension}
              optionType="button"
              buttonStyle="solid"
              size="middle"
            />
            {!fold ? (
              <>
                {dimension === ChartDimension.Dependencies && (
                  <Col span={24} style={{ marginTop: Size.BasePadding / 2 }}>
                    {curModule ? (
                      <DependencyTree
                        module={curModule}
                        dependencies={dependencies}
                        cwd={cwd}
                      />
                    ) : (
                      <Empty className={`${clsNamePrefix}-empty`} />
                    )}
                  </Col>
                )}
                {dimension === ChartDimension.Chunks && (
                  <Col span={18} style={{ marginTop: Size.BasePadding / 2 }}>
                    {curModule ? (
                      <ServerAPIProvider
                        api={SDK.ServerAPI.API.GetChunksByModuleId}
                        body={{ moduleId: curModule.id }}
                      >
                        {(res) => <ChunksTable chunks={res} />}
                      </ServerAPIProvider>
                    ) : (
                      <Empty className={`${clsNamePrefix}-empty`} />
                    )}
                  </Col>
                )}
              </>
            ) : (
              <></>
            )}
          </div>
        </Col>
      </Row>
    </>
  );
};
