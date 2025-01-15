import {
  CodepenCircleOutlined,
  ColumnHeightOutlined,
  DeploymentUnitOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import { SDK } from '@rsdoctor/types';
import {
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Popover,
  Row,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { omitBy, sumBy } from 'lodash-es';
import { DataNode as AntdDataNode } from 'antd/es/tree';
import { dirname, relative } from 'path';
import React, { useEffect, useMemo, useState } from 'react';
import { ServerAPIProvider } from '../../../components/Manifest';
import { ModuleAnalyzeComponent } from '../../ModuleAnalyze';
import { Badge as Bdg } from '../../../components/Badge';
import { KeywordInput } from '../../../components/Form/keyword';
import { Keyword } from '../../../components/Keyword';
import { TextDrawer } from '../../../components/TextDrawer';
import { Size } from '../../../constants';
import {
  DataNode,
  createFileStructures,
  formatSize,
  getOriginalLanguage,
  isJsDataUrl,
  useI18n,
} from '../../../utils';
import { ModuleGraphListContext } from '../config';
import styles from './index.module.scss';
import { Tree } from 'antd';

const { DirectoryTree } = Tree;

let expandedModulesKeys: React.Key[] = [];
const TAB_MAP = {
  source: 'source code',
  transformed: 'Transformed Code (After compile)',
  parsedSource: 'Bundled Code (After bundle and tree-shaking)',
};

const tagStyle = {
  margin: 'none',
  marginInlineEnd: 0,
};
const EmptyCodeItem = () => (
  <Empty
    description={`Do not have the module code.
  (1) If you use the brief mode, there will not have any codes to show. 
  (2) If you use lite mode, there will not have source codes.`}
  />
);

export const ModuleCodeViewer: React.FC<{ data: SDK.ModuleData }> = ({
  data,
}) => {
  const [tab, setTab] = useState('');
  const { t } = useI18n();

  const TAB_LAB_MAP: Record<string, string> = {
    source: 'Source Code',
    transformed: `Transformed Code(${t('After Compile')})`,
    parsedSource: `Bundled Code(${t('After Bundled')})`,
  };
  if (!data) return null;

  const { path } = data;

  return (
    <TextDrawer
      text=""
      buttonProps={{
        size: 'small',
        icon: (
          <Popover content="Open the Codes Box">
            <CodepenCircleOutlined />
          </Popover>
        ),
        type: 'default',
      }}
      buttonStyle={{ padding: `0 4px` }}
      drawerProps={{
        destroyOnClose: true,
        title: `Code of "${path}"`,
      }}
    >
      <ServerAPIProvider
        api={SDK.ServerAPI.API.GetModuleCodeByModuleId}
        body={{ moduleId: data.id }}
      >
        {(source) => {
          return (
            <>
              {!source['source'] &&
              !source['parsedSource'] &&
              !source['transformed'] ? (
                <EmptyCodeItem />
              ) : (
                <Card
                  className="code-size-card"
                  style={{ width: '100%' }}
                  tabList={Object.keys(omitBy(source, (s) => !s))
                    .map((k) => ({ tab: k }))
                    .map((e) => ({
                      ...e,
                      tab: TAB_LAB_MAP[e.tab],
                      key: e.tab,
                    }))}
                  defaultActiveTabKey={
                    source['parsedSource'] ? 'parsedSource' : 'source'
                  }
                  onTabChange={(v) => setTab(v)}
                  tabBarExtraContent={
                    <Popover
                      placement="bottom"
                      title={
                        <Typography.Title level={5}>Explain</Typography.Title>
                      }
                      content={
                        <>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              marginBottom: 30,
                            }}
                          >
                            <div>
                              <Typography.Text strong>Source: </Typography.Text>
                              <Typography.Text>
                                {TAB_MAP.source}
                              </Typography.Text>
                            </div>
                            <div>
                              <Typography.Text strong>
                                Transformed:
                              </Typography.Text>
                              <Typography.Text>
                                {TAB_MAP.transformed}
                              </Typography.Text>
                            </div>
                            <div>
                              <Typography.Text strong>
                                Bundled Source:
                              </Typography.Text>
                              <Typography.Text>
                                {TAB_MAP.parsedSource}
                              </Typography.Text>
                            </div>
                            <br />
                            <Typography.Text strong>{'More'}</Typography.Text>
                            <Typography.Text>
                              {t('CodeModeExplain')}
                            </Typography.Text>
                          </div>
                        </>
                      }
                      trigger={'hover'}
                    >
                      <a href="#">Explain</a>
                    </Popover>
                  }
                >
                  {source['parsedSource'] ||
                  source['source'] ||
                  source['transformed'] ? (
                    <Editor
                      theme="vs-dark"
                      language={getOriginalLanguage(path)}
                      height={window.innerHeight / 1.5}
                      value={
                        tab
                          ? source[tab as keyof SDK.ModuleSource]
                          : source['parsedSource']
                            ? source['parsedSource']
                            : source['source']
                      }
                      options={{
                        readOnly: true,
                        domReadOnly: true,
                        fontSize: 14,
                        wordWrap: 'bounded',
                        minimap: {
                          enabled: false,
                        },
                      }}
                    />
                  ) : (
                    <EmptyCodeItem />
                  )}
                </Card>
              )}
            </>
          );
        }}
      </ServerAPIProvider>
    </TextDrawer>
  );
};

export const ModuleGraphViewer: React.FC<{
  id: number | string;
  show: boolean;
  setShow: (_show: boolean) => void;
  cwd: string;
}> = ({ id, show, setShow, cwd }) => {
  if (!id) return null;

  return (
    <>
      <ServerAPIProvider api={SDK.ServerAPI.API.GetAllModuleGraph} body={{}}>
        {(modules) => (
          <ModuleAnalyzeComponent
            cwd={cwd}
            moduleId={id}
            modules={modules}
            show={show}
            setShow={setShow}
          />
        )}
      </ServerAPIProvider>
      <ServerAPIProvider api={SDK.ServerAPI.API.GetChunkGraph}>
        {(chunks) => {
          console.log(chunks);
          return <></>;
        }}
      </ServerAPIProvider>
    </>
  );
};

const inlinedResourcePathKey = '__RESOURCEPATH__';

export function getChildrenModule(node: DataNode) {
  const mods: string[] = [];

  node.children &&
    node.children.forEach((n: DataNode) => {
      if (n.isLeaf) {
        mods.push(n[inlinedResourcePathKey]);
      } else {
        getChildrenModule(n);
      }
    });

  return mods;
}

export const ModulesStatistics: React.FC<{
  modules: SDK.ModuleData[];
  chunks: SDK.ChunkData[];
  filteredModules: SDK.ModuleData[];
}> = ({ modules, chunks, filteredModules }) => {
  const { sourceSize, parsedSize, filteredParsedSize, filteredSourceSize } =
    useMemo(() => {
      return {
        sourceSize: sumBy(modules, (e) => e.size.sourceSize),
        parsedSize: sumBy(modules, (e) => e.size.parsedSize),
        filteredSourceSize: sumBy(filteredModules, (e) => e.size.sourceSize),
        filteredParsedSize: sumBy(filteredModules, (e) => e.size.parsedSize),
      };
    }, [modules, filteredModules]);

  return (
    <Space>
      <Tooltip
        title={`total modules count is ${modules.length}, the filtered modules count is ${filteredModules.length}`}
      >
        <Space>
          <Typography.Text
            type="secondary"
            style={{ fontSize: 12, fontWeight: 400 }}
          >
            Modules: {filteredModules.length} / {modules.length}
          </Typography.Text>
          <InfoCircleOutlined />
        </Space>
      </Tooltip>
      <Divider type="vertical" />
      <Tooltip
        title={
          <Space direction="vertical">
            <Typography.Text style={{ color: 'inherit' }}>
              Total modules bundled size: {formatSize(parsedSize)}
            </Typography.Text>
            <Typography.Text style={{ color: 'inherit' }}>
              Total modules source size: {formatSize(sourceSize)}
            </Typography.Text>
            <Typography.Text style={{ color: 'inherit' }}>
              Filtered modules bundled size: {formatSize(filteredParsedSize)}
            </Typography.Text>
            <Typography.Text style={{ color: 'inherit' }}>
              Filtered modules source size: {formatSize(filteredSourceSize)}
            </Typography.Text>
          </Space>
        }
      >
        <Space>
          <Typography.Text
            type="secondary"
            style={{ fontSize: 12, fontWeight: 400 }}
          >
            Modules Size:
            {filteredParsedSize === parsedSize
              ? formatSize(parsedSize)
              : `${formatSize(filteredParsedSize)} / ${formatSize(parsedSize)}`}
          </Typography.Text>
          <InfoCircleOutlined />
        </Space>
      </Tooltip>
      <Divider type="vertical" />
      <Tooltip
        title={
          <Space direction="vertical">
            <Typography.Text style={{ color: 'inherit' }}>
              this asset includes {chunks.length} chunks:
            </Typography.Text>
            {chunks.map((e) => (
              <Bdg label="chunk" value={e.name} key={e.name} />
            ))}
          </Space>
        }
      >
        <Space>
          <Typography.Text
            type="secondary"
            style={{ fontSize: 12, fontWeight: 400 }}
          >
            Chunks: {chunks.length}
          </Typography.Text>
          <InfoCircleOutlined />
        </Space>
      </Tooltip>
    </Space>
  );
};

export const AssetDetail: React.FC<{
  asset: SDK.AssetData;
  chunks: SDK.ChunkData[];
  modules: SDK.ModuleData[];
  moduleSizeLimit?: number;
  height?: number;
  root: string;
}> = ({
  asset,
  chunks: includeChunks,
  modules: includeModules,
  moduleSizeLimit,
  height,
  root,
}) => {
  const [moduleKeyword, setModuleKeyword] = useState('');
  const [defaultExpandAll, setDefaultExpandAll] = useState(false);
  const [moduleJumpList, setModuleJumpList] = useState([] as number[]);
  const [show, setShow] = useState(false);

  const filteredModules = useMemo(() => {
    let res = includeModules.slice();
    if (moduleKeyword) {
      const regexp = new RegExp(moduleKeyword, 'i');
      res = res.filter((e) => regexp.test(e.path));
    }

    if (moduleSizeLimit) {
      res = res.filter((e) => e.size.parsedSize >= moduleSizeLimit);
    }

    return res;
  }, [includeModules, moduleKeyword, moduleSizeLimit]);

  const fileStructures = useMemo(() => {
    const res = createFileStructures({
      files: filteredModules.map((e) => e.path).filter(Boolean),
      inlinedResourcePathKey,
      fileTitle(file, basename) {
        const mod = filteredModules.find((e) => e.path === file)!;

        if (!mod) return basename;

        const { parsedSize = 0, sourceSize = 0 } = mod.size;
        const isConcatenation = mod.kind === SDK.ModuleKind.Concatenation;

        const containedOtherModules =
          !isConcatenation &&
          parsedSize === 0 &&
          includeModules.filter(
            (e) => e !== mod && e.modules && e.modules.indexOf(mod.id) > -1,
          );

        return (
          <div className={styles['bundle-tree']}>
            <div className={styles.box}>
              <div className={styles.keywords}>
                <Keyword ellipsis text={basename} keyword={moduleKeyword} />
              </div>

              <div className={styles.dividerDiv}>
                <Divider className={styles.divider} dashed />
              </div>
            </div>
            <Space>
              {parsedSize !== 0 ? (
                <Tooltip
                  title={
                    <Space direction="vertical">
                      <Tag color={'orange'}>
                        {'Bundled Size:' + formatSize(parsedSize)}
                      </Tag>
                      <Tag color={'volcano'}>
                        {'Source Size:' + formatSize(sourceSize)}
                      </Tag>
                    </Space>
                  }
                  color={'white'}
                >
                  <Tag color={'purple'} style={tagStyle}>
                    {'Bundled: ' + formatSize(parsedSize)}
                  </Tag>
                </Tooltip>
              ) : sourceSize !== 0 ? (
                // fallback to display tag for source size
                <Tag color={'geekblue'}>
                  {'Source Size:' + formatSize(sourceSize)}
                </Tag>
              ) : null}
              {isConcatenation ? (
                <Tooltip
                  title={
                    <Space>
                      <Typography.Text style={{ color: 'inherit' }}>
                        this is a concatenated module, it contains
                        {mod.modules?.length} modules
                      </Typography.Text>
                    </Space>
                  }
                >
                  <Tag color="green" style={tagStyle}>
                    concatenated
                  </Tag>
                </Tooltip>
              ) : null}
              {containedOtherModules && containedOtherModules.length ? (
                <Tooltip
                  title={
                    <Space direction="vertical">
                      <Typography.Text style={{ color: 'inherit' }}>
                        this is a concatenated module, it is be contained in
                        these modules below:
                      </Typography.Text>
                      {containedOtherModules.map(({ id, path }) => {
                        if (isJsDataUrl(path)) {
                          return (
                            <Typography.Paragraph
                              ellipsis={{ rows: 4 }}
                              key={id}
                              style={{ color: 'inherit', maxWidth: '100%' }}
                              code
                            >
                              {path}
                            </Typography.Paragraph>
                          );
                        }

                        const p = relative(dirname(mod.path), path);
                        if (p.startsWith('javascript;charset=utf-8;base64,')) {
                          return (
                            <Typography.Text
                              key={id}
                              style={{ color: 'inherit', maxWidth: '100%' }}
                              code
                            >
                              {p[0] === '.' ? p : `./${p}`}
                            </Typography.Text>
                          );
                        }

                        return (
                          <Typography.Text
                            key={id}
                            style={{ color: 'inherit' }}
                            code
                          >
                            {p[0] === '.' ? p : `./${p}`}
                          </Typography.Text>
                        );
                      })}
                    </Space>
                  }
                >
                  <Tag color="green">concatenated</Tag>
                </Tooltip>
              ) : null}
              <Popover content="Open the Module Graph Box">
                <DeploymentUnitOutlined
                  onClick={() => {
                    setModuleJumpList([mod.id]);
                    setShow(true);
                  }}
                />
              </Popover>
              <ModuleCodeViewer data={mod} />
            </Space>
          </div>
        );
      },
      dirTitle(dir, defaultTitle) {
        const paths = getChildrenModule(dir);
        if (paths.length) {
          // TODO: this counts need to fixed.
          // const mods = paths.map(
          //   (e) => includeModules.find((m) => m.path === e)!,
          // );
          // const parsedSize = sumBy(mods, (e) => e.size?.parsedSize || 0);
          // const sourceSize = sumBy(mods, (e) => e.size?.sourceSize || 0);
          return (
            <Space>
              <Keyword ellipsis text={defaultTitle} keyword={''} />
              {/* {parsedSize > 0 ? (
                <>
                  <Tag style={tagStyle} color={'orange'}>
                    {'Bundled:' + formatSize(parsedSize)}
                  </Tag>
                  <Tag style={tagStyle} color={'lime'}>
                    {'Source:' + formatSize(sourceSize)}
                  </Tag>
                </>
              ) : (
                <Tag style={tagStyle} color={'lime'}>
                  {'Source:' + formatSize(sourceSize)}
                </Tag>
              )} */}
            </Space>
          );
        }

        return defaultTitle;
      },
      page: 'bundle',
    });
    return res;
  }, [filteredModules]);

  const onSearch = (value: string) => setModuleKeyword(value);

  useEffect(() => {
    setModuleKeyword('');
    setDefaultExpandAll(false);
  }, [asset]);

  useEffect(() => {
    setDefaultExpandAll(false);
  }, [moduleKeyword]);

  return (
    <ModuleGraphListContext.Provider
      value={{ moduleJumpList, setModuleJumpList }}
    >
      <Card
        className={styles.bundle}
        title={`Modules of "${asset.path}"`}
        bodyStyle={{ overflow: 'scroll', height }}
        size="small"
      >
        {includeModules.length ? (
          <Row>
            <Col span={24}>
              <ModulesStatistics
                modules={includeModules}
                chunks={includeChunks}
                filteredModules={filteredModules}
              />
            </Col>
            <Col span={24}>
              <Space>
                <KeywordInput
                  placeholder="search module by keyword"
                  onChange={onSearch}
                  key={asset.path}
                />
                <Button
                  onClick={() => setDefaultExpandAll(true)}
                  size="small"
                  icon={<ColumnHeightOutlined />}
                />
              </Space>
            </Col>
            <Col span={24} style={{ marginTop: Size.BasePadding }}>
              {filteredModules.length ? (
                <DirectoryTree
                  key={`tree_${moduleKeyword}_${defaultExpandAll}_${asset.path}`}
                  selectable={false}
                  defaultExpandAll={
                    defaultExpandAll || filteredModules.length <= 20
                  }
                  onExpand={(expandedKeys) => {
                    expandedModulesKeys = expandedKeys;
                  }}
                  defaultExpandParent
                  defaultExpandedKeys={
                    expandedModulesKeys?.length
                      ? expandedModulesKeys
                      : fileStructures.length === 1
                        ? [fileStructures[0].key]
                        : []
                  }
                  treeData={fileStructures as AntdDataNode[]}
                  rootStyle={{
                    minHeight: '800px',
                    border: '1px solid rgba(235, 237, 241)',
                    padding: '14px 20px',
                  }}
                />
              ) : (
                <Empty
                  description={
                    <Typography.Text
                      strong
                    >{`"${moduleKeyword}" can't match any modules`}</Typography.Text>
                  }
                />
              )}
            </Col>
          </Row>
        ) : (
          <Empty
            description={
              <Typography.Text
                strong
              >{`"${asset.path}" doesn't have any modules`}</Typography.Text>
            }
          />
        )}

        <ModuleGraphViewer
          id={
            moduleJumpList?.length
              ? moduleJumpList[moduleJumpList.length - 1]
              : ''
          }
          show={show}
          setShow={setShow}
          cwd={root}
        />
      </Card>
    </ModuleGraphListContext.Provider>
  );
};
