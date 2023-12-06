import { CodepenOutlined, ColumnHeightOutlined, DeploymentUnitOutlined, InfoCircleOutlined } from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import { SDK } from '@rsdoctor/types';
import { Button, Card, Col, Divider, Empty, Popover, Row, Space, Tag, Tooltip, Typography } from 'antd';
import { sumBy } from 'lodash-es';
import { dirname, relative } from 'path';
import { Key } from 'rc-tree/lib/interface';
import React, { useEffect, useMemo, useState } from 'react';
import { ServerAPIProvider } from '../../../components/Manifest';
// import { ModuleAnalyzeComponent } from '../ModuleAnalyze'; // TODO: module analyze page
import { Badge as Bdg } from '../../../components/Badge';
import { FileTree } from '../../../components/FileTree';
import { KeywordInput } from '../../../components/Form/keyword';
import { Keyword } from '../../../components/Keyword';
import { TextDrawer } from '../../../components/TextDrawer';
import { Size } from '../../../constants';
import { DataNode, createFileStructures, formatSize, getOriginalLanguage, isJsDataUrl, useI18n } from '../../../utils';
import { ModuleGraphListContext } from '../config';

let expanedModulesKeys: Key[] = [];
const TAB_MAP = {
  source: 'source code',
  transformed: 'transformed code (After compile)',
  parsedSource: 'parsed code (After bundle and tree-shaking)',
};

export const ModuleCodeViewer: React.FC<{ data: SDK.ModuleData }> = ({ data }) => {
  const [tab, setTab] = useState('parsedSource');
  const { t } = useI18n();

  const TAB_LAB_MAP: Record<string, string> = {
    source: 'source code',
    transformed: `transformed(${t('After Compile')})`,
    parsedSource: `parsedSource(${t('After Bundle')})`,
  };
  if (!data) return null;

  const { path } = data;

  return (
    <TextDrawer
      text=""
      buttonProps={{
        size: 'small',
        icon: <CodepenOutlined />,
        type: 'default',
      }}
      buttonStyle={{ padding: `0 4px` }}
      drawerProps={{
        destroyOnClose: true,
        title: `Code of "${path}"`,
      }}
    >
      <Card
        className="code-size-card"
        style={{ width: '100%' }}
        tabList={[{ tab: 'source' }, { tab: 'transformed' }, { tab: 'parsedSource' }].map((e) => ({
          ...e,
          tab: TAB_LAB_MAP[e.tab],
          key: e.tab,
        }))}
        activeTabKey={tab}
        onTabChange={(v) => setTab(v)}
        tabBarExtraContent={
          <Popover
            placement="bottom"
            title={<Typography.Title level={5}>Explain</Typography.Title>}
            content={
              <>
                <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 30 }}>
                  <div>
                    <Typography.Text strong>source: </Typography.Text>
                    <Typography.Text>{TAB_MAP.source}</Typography.Text>
                  </div>
                  <div>
                    <Typography.Text strong>transformed: </Typography.Text>
                    <Typography.Text>{TAB_MAP.transformed}</Typography.Text>
                  </div>
                  <div>
                    <Typography.Text strong>parsedSource: </Typography.Text>
                    <Typography.Text>{TAB_MAP.parsedSource}</Typography.Text>
                  </div>
                  <br />
                  <Typography.Text strong>{'More'}</Typography.Text>
                  <Typography.Text>{t('CodeModeExplain')}</Typography.Text>
                </div>
              </>
            }
            trigger={'hover'}
          >
            <a href="#">Explain</a>
          </Popover>
        }
      >
        <ServerAPIProvider api={SDK.ServerAPI.API.GetModuleCodeByModuleId} body={{ moduleId: data.id }}>
          {(source) => {
            return (
              <Editor
                theme="vs-dark"
                language={getOriginalLanguage(path)}
                // eslint-disable-next-line financial/no-float-calculation
                height={window.innerHeight / 1.5}
                value={source[tab]}
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
            );
          }}
        </ServerAPIProvider>
      </Card>
    </TextDrawer>
  );
};

// export const ModuleGraphViewer: React.FC<{
//   id: number | string;
//   show: boolean;
//   setShow: (_show: boolean) => void;
//   cwd: string;
// }> = ({ id, show, setShow, cwd }) => {
//   if (!id) return null;

//   return (
//     <Drawer open={show} maskClosable width={drawerWidth} onClose={() => setShow(false)}>
//       <ServerAPIProvider api={SDK.ServerAPI.API.GetAllModuleGraph} body={{}}>
//         {(modules) => <ModuleAnalyzeComponent cwd={cwd} moduleId={id} modules={modules} />}
//       </ServerAPIProvider>
//     </Drawer>
//   );
// };

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
  const { sourceSize, parsedSize, filteredParsedSize, filteredSourceSize } = useMemo(() => {
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
          <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
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
              Total modules parsed size: {formatSize(parsedSize)}
            </Typography.Text>
            <Typography.Text style={{ color: 'inherit' }}>
              Total modules source size: {formatSize(sourceSize)}
            </Typography.Text>
            <Typography.Text style={{ color: 'inherit' }}>
              Filtered modules parsed size: {formatSize(filteredParsedSize)}
            </Typography.Text>
            <Typography.Text style={{ color: 'inherit' }}>
              Filtered modules source size: {formatSize(filteredSourceSize)}
            </Typography.Text>
          </Space>
        }
      >
        <Space>
          <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
            Modules Size:{' '}
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
            <Typography.Text style={{ color: 'inherit' }}>this asset includes {chunks.length} chunks: </Typography.Text>
            {chunks.map((e) => (
              <Bdg label="chunk" value={e.name} key={e.name} />
            ))}
          </Space>
        }
      >
        <Space>
          <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
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
}> = ({ asset, chunks: includeChunks, modules: includeModules, moduleSizeLimit, height }) => {
  // const navigate = useNavigate();
  const [moduleKeyword, setModuleKeyword] = useState('');
  const [defaultExpandAll, setDefaultExpandAll] = useState(false);
  const [moduleJumpList, setModuleJumpList] = useState([] as number[]);
  const [_show, setShow] = useState(false);

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

  const avgSize = sumBy(includeModules, (e) => e.size.parsedSize || 0) / includeModules.length;

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
          includeModules.filter((e) => e !== mod && e.modules && e.modules.indexOf(mod.id) > -1);

        return (
          <Space>
            <Keyword ellipsis style={{ maxWidth: 500 }} text={basename} keyword={moduleKeyword} />
            {parsedSize !== 0 ? (
              <Bdg
                label={'parsed size'}
                value={formatSize(parsedSize)}
                type={parsedSize >= avgSize ? 'error' : 'default'}
                tooltip={
                  <Space direction="vertical">
                    <Bdg label={'parsed size'} value={formatSize(parsedSize)} />
                    <Bdg label={'source size'} value={formatSize(sourceSize)} />
                  </Space>
                }
              />
            ) : sourceSize !== 0 ? (
              // fallback to display tag for source size
              <Bdg label={'source size'} value={formatSize(sourceSize)} type={'default'} />
            ) : null}
            {isConcatenation ? (
              <Tooltip
                title={
                  <Space>
                    <Typography.Text style={{ color: 'inherit' }}>
                      this is a concatenated module, it contains {mod.modules?.length} modules
                    </Typography.Text>
                  </Space>
                }
              >
                <Tag color="#46b5c8">concatenated</Tag>
              </Tooltip>
            ) : null}
            {containedOtherModules && containedOtherModules.length ? (
              <Tooltip
                title={
                  <Space direction="vertical">
                    <Typography.Text style={{ color: 'inherit' }}>
                      this is a concatenated module, it is be contained in these modules below:
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
                          <Typography.Text key={id} style={{ color: 'inherit', maxWidth: '100%' }} code>
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
                <Tag color="#46b5c8">concatenated</Tag>
              </Tooltip>
            ) : null}
            <Button
              size="small"
              icon={<DeploymentUnitOutlined />}
              onClick={() => {
                setModuleJumpList([mod.id]);
                setShow(true);
              }}
            >
              module explorer
            </Button>
            <ModuleCodeViewer data={mod} />
          </Space>
        );
      },
      dirTitle(dir, defaultTitle) {
        const paths = getChildrenModule(dir);
        if (paths.length) {
          const mods = paths.map((e) => includeModules.find((m) => m.path === e)!);
          const parsedSize = sumBy(mods, (e) => e.size?.parsedSize || 0);
          return (
            <Space>
              <Typography.Text>{defaultTitle}</Typography.Text>
              {parsedSize > 0 ? (
                <Bdg
                  label={'parsed size'}
                  value={formatSize(parsedSize)}
                  type={parsedSize >= avgSize ? 'error' : 'default'}
                />
              ) : null}
            </Space>
          );
        }

        return defaultTitle;
      },
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
    <ModuleGraphListContext.Provider value={{ moduleJumpList, setModuleJumpList }}>
      <Card title={`Modules of "${asset.path}"`} bodyStyle={{ overflow: 'scroll', height }} size="small">
        {includeModules.length ? (
          <Row>
            <Col span={24}>
              <ModulesStatistics modules={includeModules} chunks={includeChunks} filteredModules={filteredModules} />
            </Col>
            <Col span={24}>
              <Space>
                <KeywordInput placeholder="search module by keyword" onChange={onSearch} key={asset.path} />
                <Button onClick={() => setDefaultExpandAll(true)} size="small" icon={<ColumnHeightOutlined />}>
                  expand all
                </Button>
              </Space>
            </Col>
            <Col span={24} style={{ marginTop: Size.BasePadding }}>
              {filteredModules.length ? (
                <FileTree
                  onExpand={(expandedKeys) => {
                    expanedModulesKeys = expandedKeys;
                  }}
                  treeData={fileStructures}
                  autoExpandParent
                  defaultExpandParent
                  defaultExpandedKeys={
                    expanedModulesKeys?.length
                      ? expanedModulesKeys
                      : fileStructures.length === 1
                      ? [fileStructures[0].key]
                      : []
                  }
                  key={`tree_${moduleKeyword}_${defaultExpandAll}_${asset.path}`}
                  defaultExpandAll={defaultExpandAll || filteredModules.length <= 20}
                />
              ) : (
                <Empty
                  description={<Typography.Text strong>{`"${moduleKeyword}" can't match any modules`}</Typography.Text>}
                />
              )}
            </Col>
          </Row>
        ) : (
          <Empty description={<Typography.Text strong>{`"${asset.path}" don't has any modules`}</Typography.Text>} />
        )}

        {/* <ModuleGraphViewer
          id={moduleJumpList?.length ? moduleJumpList[moduleJumpList.length - 1] : ''}
          show={show}
          setShow={setShow}
          cwd={root}
        /> */}
      </Card>
    </ModuleGraphListContext.Provider>
  );
};
