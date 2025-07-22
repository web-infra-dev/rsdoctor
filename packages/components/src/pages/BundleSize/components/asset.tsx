import {
  CodepenCircleOutlined,
  ColumnHeightOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
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
  Tree,
  Typography,
} from 'antd';
import { DataNode as AntdDataNode } from 'antd/es/tree';
import { omitBy, sumBy } from 'lodash-es';
import { dirname, relative } from 'path';
import React, { useEffect, useMemo, useState } from 'react';
import { CodeViewer } from 'src/components/base';
import { Badge as Bdg } from '../../../components/Badge';
import { KeywordInput } from '../../../components/Form/keyword';
import { Keyword } from '../../../components/Keyword';
import { ServerAPIProvider } from '../../../components/Manifest';
import { TextDrawer } from '../../../components/TextDrawer';
import { Size } from '../../../constants';
import {
  DataNode,
  createFileStructures,
  formatSize,
  isJsDataUrl,
  useI18n,
} from '../../../utils';
import { ModuleAnalyzeComponent } from '../../ModuleAnalyze';
import { ModuleGraphListContext } from '../config';
import styles from './index.module.scss';

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
                  styles={{ body: { padding: 0, overflow: 'hidden' } }}
                >
                  {source['parsedSource'] ||
                  source['source'] ||
                  source['transformed'] ? (
                    <CodeViewer
                      isEmbed
                      code={
                        tab
                          ? source[tab as keyof SDK.ModuleSource]
                          : source['parsedSource']
                            ? source['parsedSource']
                            : source['source']
                      }
                      filePath={path}
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
  );
};

const inlinedResourcePathKey = '__RESOURCEPATH__';

export function getChildrenModule(node: DataNode, mods: string[]) {
  node.children &&
    node.children.forEach((n: DataNode) => {
      if (n.isLeaf) {
        mods.push(n[inlinedResourcePathKey]);
      } else {
        getChildrenModule(n, mods);
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

const ConcatenatedTag = ({ moduleCount }: { moduleCount: number }) => {
  return (
    <Tooltip
      title={
        <Space>
          <Typography.Text style={{ color: 'inherit' }}>
            This is a concatenated container module that includes {moduleCount}{' '}
            modules
          </Typography.Text>
        </Space>
      }
    >
      <Tag color="blue" style={tagStyle}>
        concatenated container
      </Tag>
    </Tooltip>
  );
};

const TotalBundledSizeTag = ({ size }: { size: number }) => {
  return (
    <Tooltip
      title={
        <Space>
          <Typography.Text style={{ color: 'inherit' }}>
            The total output size of all the files in this folder. If you
            enabled minification, this value shows the minified size.
          </Typography.Text>
        </Space>
      }
    >
      <Tag style={tagStyle} color={'geekblue'}>
        {`bundled size: ${formatSize(size)}`}
      </Tag>
    </Tooltip>
  );
};

const BundledSizeTag = ({ size }: { size: number }) => {
  return (
    <Tooltip
      title={
        <Space>
          <Typography.Text style={{ color: 'inherit' }}>
            The final output size of this file. If you enabled minification,
            this value shows the minified size.
          </Typography.Text>
        </Space>
      }
    >
      <Tag color={'geekblue'}>{`bundled size: ${formatSize(size)}`}</Tag>
    </Tooltip>
  );
};

const GzippedSizeTag = ({ size }: { size: number }) => {
  return (
    <Tooltip
      title={
        <Space>
          <Typography.Text style={{ color: 'inherit' }}>
            The compressed file size that users actually download, as most web
            servers use gzip compression.
          </Typography.Text>
        </Space>
      }
    >
      <Tag color={'orange'}>{`gzipped: ${formatSize(size)}`}</Tag>
    </Tooltip>
  );
};

const TotalSourceSizeTag = ({ size }: { size: number }) => {
  return (
    <Tooltip
      title={
        <Space>
          <Typography.Text style={{ color: 'inherit' }}>
            The total original size of all the files in this folder, before any
            transformations and minification.
          </Typography.Text>
        </Space>
      }
    >
      <Tag
        style={tagStyle}
        color={'cyan'}
      >{`source size: ${formatSize(size)}`}</Tag>
    </Tooltip>
  );
};

const SourceSizeTag = ({ size }: { size: number }) => {
  return (
    <Tooltip
      title={
        <Space>
          <Typography.Text style={{ color: 'inherit' }}>
            The original size of this file, before any transformations and
            minification.
          </Typography.Text>
        </Space>
      }
    >
      <Tag color={'cyan'}>{`source size: ${formatSize(size)}`}</Tag>
    </Tooltip>
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

        const { parsedSize = 0, sourceSize = 0, gzipSize = 0 } = mod.size;
        const isConcatenation = mod.kind === SDK.ModuleKind.Concatenation;

        const containedOtherModules =
          !isConcatenation &&
          parsedSize === 0 &&
          includeModules.filter(
            (e) => e !== mod && e.modules && e.modules.indexOf(mod.id) > -1,
          );

        return (
          <div className={styles['bundle-tree']}>
            <Popover
              content={`Open the ${basename}’s module reasons tree.`}
              placement="bottom"
            >
              <div
                className={styles.box}
                onClick={() => {
                  setModuleJumpList([mod.id]);
                  setShow(true);
                }}
              >
                <div className={styles.keywords}>
                  <Keyword ellipsis text={basename} keyword={''} />
                </div>
                <div className={styles.dividerDiv}>
                  <Divider className={styles.divider} dashed />
                </div>
              </div>
            </Popover>
            <Space>
              {parsedSize !== 0 ? (
                <>
                  {typeof gzipSize === 'number' ? (
                    <Popover
                      placement="bottom"
                      content={<SourceSizeTag size={sourceSize} />}
                    >
                      <Space direction="horizontal">
                        <BundledSizeTag size={parsedSize} />
                        <GzippedSizeTag size={gzipSize} />
                      </Space>
                    </Popover>
                  ) : (
                    <Space direction="horizontal">
                      <BundledSizeTag size={parsedSize} />
                      <SourceSizeTag size={sourceSize} />
                    </Space>
                  )}
                </>
              ) : sourceSize !== 0 ? (
                // fallback to display tag for source size
                <SourceSizeTag size={sourceSize} />
              ) : null}
              {isConcatenation ? (
                <ConcatenatedTag moduleCount={mod.modules?.length || 0} />
              ) : null}
              {containedOtherModules && containedOtherModules.length ? (
                <Tooltip
                  title={
                    <Space direction="vertical">
                      <Typography.Text style={{ color: 'inherit' }}>
                        This module is concatenated into another container
                        module:
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

              <ModuleCodeViewer data={mod} />
            </Space>
          </div>
        );
      },
      dirTitle(dir, defaultTitle) {
        const mods: string[] = [];
        const paths = getChildrenModule(dir, mods);
        if (paths.length) {
          const mods = paths.map(
            (e) => includeModules.find((m) => m.path === e)!,
          );

          const parsedSize = sumBy(mods, (e) => e.size?.parsedSize || 0);
          const sourceSize = sumBy(mods, (e) => e.size?.sourceSize || 0);
          return (
            <div className={styles['bundle-tree']}>
              <div className={styles.box}>
                <div className={styles.keywords}>
                  <Keyword ellipsis text={defaultTitle} keyword={''} />
                </div>
                <div className={styles.dividerDiv}>
                  <Divider className={styles.divider} dashed />
                </div>
              </div>
              <Space>
                {parsedSize > 0 ? (
                  <>
                    <TotalBundledSizeTag size={parsedSize} />
                    <TotalSourceSizeTag size={sourceSize} />
                  </>
                ) : (
                  <TotalSourceSizeTag size={sourceSize} />
                )}
              </Space>
            </div>
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
        bodyStyle={{ minHeight: height }}
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
                  // @ts-ignore
                  defaultExpandedKeys={
                    expandedModulesKeys?.length
                      ? expandedModulesKeys
                      : fileStructures.length === 1
                        ? [fileStructures[0].key]
                        : []
                  }
                  treeData={fileStructures as AntdDataNode[]}
                  rootStyle={{
                    maxHeight: '500px',
                    overflow: 'auto',
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
