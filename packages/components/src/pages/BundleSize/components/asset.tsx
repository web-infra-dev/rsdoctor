import {
  CodepenCircleOutlined,
  ColumnHeightOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { SDK } from '@rsdoctor/types';
import {
  Button,
  Card,
  Divider,
  Empty,
  Popover as BasePopover,
  Space,
  Tag,
  type TagProps,
  type TooltipProps,
  type PopoverProps,
  Tooltip as BaseTooltip,
  Tree,
  Typography,
} from 'antd';
import { DataNode as AntdDataNode } from 'antd/es/tree';
import { debounce, omitBy, sumBy } from '@rsdoctor/shared/collection';
import { dirname, relative } from 'path';
import React, {
  useEffect,
  useMemo,
  useState,
  memo,
  useCallback,
  use,
  createContext,
} from 'react';
import { CodeViewer } from 'src/components/base';
import { Badge as Bdg } from '../../../components/Badge';
import { KeywordInput } from '../../../components/Form/keyword';
import { ServerAPIProvider } from '../../../components/Manifest';
import { TextDrawer } from '../../../components/TextDrawer';
import { Size } from '../../../constants';
import {
  DataNode,
  createFileStructures,
  formatSize,
  isJsDataUrl,
  useElementSize,
  useI18n,
} from '../../../utils';
import { ModuleAnalyzeComponent } from '../../ModuleAnalyze';
import { ModuleGraphListContext } from '../config';
import styles from './asset.module.scss';
import { ModuleData } from '@rsdoctor/shared/graph';
import { ErrorBoundary } from 'react-error-boundary';

const { DirectoryTree } = Tree;

const TAB_MAP = {
  source: 'source code',
  transformed: 'Transformed Code (After compile)',
  parsedSource: 'Bundled Code (After bundle and tree-shaking)',
};

// antd's tooltip/popover component often throws 185 error when rendered inside a virtual list.
// this is used as a reset mechanism for the error boundary.
// also these tooltips are a real performance killer
// and they can be easily turned off by wrapping the problematic subtree in DisablePopups
const POPUPS_ENABLED_BY_DEFAULT = true;
const PopupContext = createContext({ enabled: POPUPS_ENABLED_BY_DEFAULT });
const DisablePopups = ({ children }: { children: any }) => (
  <PopupContext.Provider value={{ enabled: false }}>
    {children}
  </PopupContext.Provider>
);
const usePopupsEnabled = (): boolean => use(PopupContext)?.enabled ?? true;
const Tooltip = (props: TooltipProps) => {
  const enabled = usePopupsEnabled();
  if (enabled) return <BaseTooltip {...props} />;
  else return props.children ?? null;
};
const Popover = (props: PopoverProps) => {
  const enabled = usePopupsEnabled();
  if (enabled) return <BasePopover {...props} />;
  else return props.children ?? null;
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
  if (node.children) {
    node.children.forEach((n: DataNode) => {
      if (n.isLeaf) {
        mods.push(n[inlinedResourcePathKey]);
      } else {
        getChildrenModule(n, mods);
      }
    });
  }

  return mods;
}

export const ModulesStatistics: React.FC<{
  modules: SDK.ModuleData[];
  chunks: SDK.ChunkData[];
  filteredModules: SDK.ModuleData[];
}> = memo(({ modules, chunks, filteredModules }) => {
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
});

const defaultTagStyle: React.CSSProperties = {
  margin: 'none',
  marginInlineEnd: 0,
};
const AbstractTag = ({
  color,
  tooltipTitle,
  style = defaultTagStyle,
  children,
}: {
  color: TagProps['color'];
  children: string;
  tooltipTitle: string;
  style?: React.CSSProperties | null;
}) => {
  return (
    <Tooltip
      title={
        <Space>
          <Typography.Text style={{ color: 'inherit' }}>
            {tooltipTitle}
          </Typography.Text>
        </Space>
      }
    >
      <Tag color={color} style={style || undefined}>
        {children}
      </Tag>
    </Tooltip>
  );
};
const ConcatenatedTag = ({ moduleCount }: { moduleCount: number }) => {
  return (
    <AbstractTag
      color="blue"
      tooltipTitle={`This is a concatenated container module that includes ${moduleCount} modules`}
    >
      concatenated container
    </AbstractTag>
  );
};
const TotalBundledSizeTag = ({ size }: { size: number }) => {
  return (
    <AbstractTag
      color="geekblue"
      tooltipTitle="The total output size of all the files in this folder. If you enabled minification, this value shows the minified size."
    >
      {`bundled size: ${formatSize(size)}`}
    </AbstractTag>
  );
};
const BundledSizeTag = ({ size }: { size: number }) => {
  return (
    <AbstractTag
      color="geekblue"
      style={null}
      tooltipTitle="The final output size of this file. If you enabled minification, this value shows the minified size."
    >
      {`bundled size: ${formatSize(size)}`}
    </AbstractTag>
  );
};
const GzippedSizeTag = ({ size }: { size: number }) => {
  return (
    <AbstractTag
      color="orange"
      style={null}
      tooltipTitle="The compressed file size that users actually download, as most web servers use gzip compression."
    >
      {`gzipped: ${formatSize(size)}`}
    </AbstractTag>
  );
};
const TotalSourceSizeTag = ({ size }: { size: number }) => {
  return (
    <AbstractTag
      tooltipTitle="The total original size of all the files in this folder, before any transformations and minification."
      color="cyan"
    >{`source size: ${formatSize(size)}`}</AbstractTag>
  );
};
const SourceSizeTag = ({ size }: { size: number }) => {
  return (
    <AbstractTag
      color="cyan"
      style={null}
      tooltipTitle="The original size of this file, before any transformations and minification."
    >
      {`source size: ${formatSize(size)}`}
    </AbstractTag>
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
  const [showModuleGraphViewer, setShowModuleGraphViewer] = useState(false);
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

  const onSearch = (value: string) => setModuleKeyword(value);
  const openModuleGraphViewer = useCallback((modId: number[]) => {
    setShowModuleGraphViewer(true);
    setModuleJumpList(modId);
  }, []);

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
        style={
          height
            ? ({
                '--body-min-height': height + 'px',
              } as React.CSSProperties)
            : undefined
        }
        classNames={{
          body: styles.bundleBody,
        }}
        size="small"
      >
        {includeModules.length ? (
          <>
            <div>
              <ModulesStatistics
                modules={includeModules}
                chunks={includeChunks}
                filteredModules={filteredModules}
              />
            </div>
            <div>
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
            </div>
            <AssetDetailTree
              assetPath={asset.path}
              includeModules={includeModules}
              filteredModules={filteredModules}
              defaultExpandAll={defaultExpandAll}
              moduleKeyword={moduleKeyword}
              openModuleGraphViewer={openModuleGraphViewer}
            />
          </>
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
          show={showModuleGraphViewer}
          setShow={setShowModuleGraphViewer}
          cwd={root}
        />
      </Card>
    </ModuleGraphListContext.Provider>
  );
};

let defaultExpandedModulesKeys: React.Key[] = [];
const AssetDetailTree = memo(
  ({
    filteredModules,
    includeModules,
    defaultExpandAll,
    moduleKeyword,
    openModuleGraphViewer,
    assetPath,
  }: {
    filteredModules: SDK.ModuleData[];
    includeModules: SDK.ModuleData[];
    defaultExpandAll: boolean;
    moduleKeyword: string;
    openModuleGraphViewer: (moduleId: number[]) => void;
    assetPath: string;
  }) => {
    const ITEM_HEIGHT = 30;
    const PERMANENT_PERF_MODE = false;
    const DISABLE_PERF_MODE_SCROLL_DELAY = 150;
    const ENABLE_ANIMATIONS = false;

    // disable all the tooltips and popovers inside the tree?
    const [performanceMode, setPerformanceMode] = useState(PERMANENT_PERF_MODE);
    const [
      bundleTreeRef,
      { height: bundleTreeHeight, width: bundleTreeWidth },
    ] = useElementSize();

    const onScroll = useMemo(() => {
      if (PERMANENT_PERF_MODE) return undefined;
      const disablePerformanceMode = debounce(() => {
        setPerformanceMode(false);
      }, DISABLE_PERF_MODE_SCROLL_DELAY);
      const onScroll = () => {
        setPerformanceMode(true);
        disablePerformanceMode();
      };
      return onScroll;
    }, []);

    const treeData = useMemo(() => {
      // Normalize paths for comparison - convert backslashes to forward slashes
      const normalizePath = (path: string) => path.replace(/\\/g, '/');

      const filteredModulesMap: Map<string, ModuleData> = new Map();
      const files: string[] = [];
      for (const mod of filteredModules) {
        if (mod.path) {
          filteredModulesMap.set(normalizePath(mod.path), mod);
          files.push(mod.path);
        }
      }
      const includeModulesMap: Map<string, ModuleData> = new Map();
      for (const mod of includeModules) {
        if (mod.path) {
          includeModulesMap.set(normalizePath(mod.path), mod);
        }
      }

      const onFileEntryClick = (modId: number) =>
        openModuleGraphViewer([modId]);

      const treeData = createFileStructures({
        files,
        inlinedResourcePathKey,
        fileTitle(file, basename) {
          const mod = filteredModulesMap.get(normalizePath(file));

          if (!mod) return basename;

          return (
            <AssetDetailTreeFileEntry
              mod={mod}
              basename={basename}
              includeModules={includeModules}
              onClick={onFileEntryClick}
            />
          );
        },
        dirTitle(dir, defaultTitle) {
          // all these calculations can be done directly in AssetDetailTreeDirEntry component
          // but in that case they'll run on every component render
          // and here it happens only once on dependencies change
          const paths = getChildrenModule(dir, []);

          if (!paths.length) return defaultTitle;

          const { parsedSize, sourceSize } = paths.reduce(
            (acc, path) => {
              const mod = includeModulesMap.get(normalizePath(path));
              if (mod) {
                acc.sourceSize += mod.size?.sourceSize || 0;
                acc.parsedSize += mod.size?.parsedSize || 0;
              }
              return acc;
            },
            { sourceSize: 0, parsedSize: 0 },
          );
          return (
            <AssetDetailTreeDirEntry
              title={defaultTitle}
              parsedSize={parsedSize}
              sourceSize={sourceSize}
            />
          );
        },
        page: 'bundle',
      });
      return treeData;
    }, [filteredModules, openModuleGraphViewer]);

    return (
      <PopupContext.Provider value={{ enabled: !performanceMode }}>
        <div
          className={styles.bundleTree}
          style={
            {
              marginTop: Size.BasePadding,
              '--item-height': ITEM_HEIGHT + 'px',
            } as React.CSSProperties
          }
        >
          <div className={styles.bundleTreeViewport}>
            <div className={styles.bundleTreeInnerViewport} ref={bundleTreeRef}>
              {bundleTreeHeight > 0 && (
                <>
                  {filteredModules.length ? (
                    <DirectoryTree
                      onScroll={onScroll}
                      key={`tree_${moduleKeyword}_${defaultExpandAll}_${assetPath}`}
                      selectable={false}
                      virtual
                      itemHeight={ITEM_HEIGHT}
                      height={bundleTreeHeight}
                      style={
                        bundleTreeWidth
                          ? { width: bundleTreeWidth + 'px' }
                          : undefined
                      }
                      defaultExpandAll={
                        defaultExpandAll || filteredModules.length <= 20
                      }
                      onExpand={(expandedKeys) => {
                        defaultExpandedModulesKeys = expandedKeys;
                      }}
                      defaultExpandParent
                      // @ts-ignore
                      defaultExpandedKeys={
                        defaultExpandedModulesKeys?.length
                          ? defaultExpandedModulesKeys
                          : treeData.length === 1
                            ? [treeData[0].key]
                            : []
                      }
                      treeData={treeData as AntdDataNode[]}
                      motion={ENABLE_ANIMATIONS ? undefined : false}
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
                </>
              )}
            </div>
          </div>
        </div>
      </PopupContext.Provider>
    );
  },
);

const AssetDetailTreeDirEntry = memo(
  ({
    title,
    parsedSize,
    sourceSize,
  }: {
    title: string;
    parsedSize: number;
    sourceSize: number;
  }) => {
    const render = () => {
      return (
        <div className={styles.bundleTreeEntryContent}>
          <Popover content={title}>
            <Typography.Text className={styles.bundleTreeEntryTitle}>
              {title}
            </Typography.Text>
          </Popover>
          <div className={styles.divider} />
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
    };
    const renderWithoutPopups = () => <DisablePopups>{render()}</DisablePopups>;
    return (
      <div className={styles.bundleTreeEntry}>
        <ErrorBoundary fallbackRender={renderWithoutPopups}>
          {render()}
        </ErrorBoundary>
      </div>
    );
  },
);

const AssetDetailTreeFileEntry = memo(
  ({
    mod,
    basename,
    includeModules,
    onClick,
  }: {
    mod: SDK.ModuleData;
    basename: string;
    includeModules: SDK.ModuleData[];
    onClick: (modId: number) => void;
  }) => {
    const isConcatenation = mod.kind === SDK.ModuleKind.Concatenation;
    const { parsedSize = 0, sourceSize = 0, gzipSize = 0 } = mod.size;

    const renderSize = () => {
      if (parsedSize !== 0) {
        const sourceSizeTag = <SourceSizeTag size={sourceSize} />;
        const bundledSizeTag = <BundledSizeTag size={parsedSize} />;
        if (typeof gzipSize === 'number') {
          return (
            <Popover placement="bottom" content={sourceSizeTag}>
              <Space direction="horizontal">
                {bundledSizeTag}
                <GzippedSizeTag size={gzipSize} />
              </Space>
            </Popover>
          );
        } else {
          return (
            <Space direction="horizontal">
              {bundledSizeTag}
              {sourceSizeTag}
            </Space>
          );
        }
      } else if (sourceSize !== 0) {
        // fallback to display tag for source size
        return <SourceSizeTag size={sourceSize} />;
      } else {
        return null;
      }
    };
    const renderContainedOtherModules = () => {
      const containedOtherModules =
        !isConcatenation &&
        parsedSize === 0 &&
        includeModules.filter(
          (e) => e !== mod && e.modules && e.modules.indexOf(mod.id) > -1,
        );
      if (containedOtherModules && containedOtherModules.length) {
        return (
          <Tooltip
            title={
              <Space direction="vertical">
                <Typography.Text style={{ color: 'inherit' }}>
                  This module is concatenated into another container module:
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
                    <Typography.Text key={id} style={{ color: 'inherit' }} code>
                      {p[0] === '.' ? p : `./${p}`}
                    </Typography.Text>
                  );
                })}
              </Space>
            }
          >
            <Tag color="green">concatenated</Tag>
          </Tooltip>
        );
      } else {
        return null;
      }
    };
    const render = () => {
      return (
        <div className={styles.bundleTreeEntryContent}>
          <Popover
            content={`Open the ${basename}’s module reasons tree.`}
            placement="bottom"
          >
            <div
              className={styles.bundleTreeEntryTitleWrap}
              onClick={() => onClick(mod.id)}
            >
              <Popover content={basename}>
                <Typography.Text className={styles.bundleTreeEntryTitle}>
                  {basename}
                </Typography.Text>
              </Popover>
              <div className={styles.divider} />
            </div>
          </Popover>
          <Space>
            {renderSize()}
            {isConcatenation && (
              <ConcatenatedTag moduleCount={mod.modules?.length || 0} />
            )}
            {renderContainedOtherModules()}
            <ModuleCodeViewer data={mod} />
          </Space>
        </div>
      );
    };
    const renderWithoutPopups = () => <DisablePopups>{render()}</DisablePopups>;
    return (
      <div className={styles.bundleTreeEntry}>
        <ErrorBoundary fallbackRender={renderWithoutPopups}>
          {render()}
        </ErrorBoundary>
      </div>
    );
  },
);
