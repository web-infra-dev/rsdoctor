import {
  CodepenCircleOutlined,
  DeploymentUnitOutlined,
  InfoCircleOutlined,
  ShrinkOutlined,
  ArrowsAltOutlined,
} from '@ant-design/icons';
import { type Client, SDK } from '@rsdoctor/types';
import {
  Button,
  Card,
  Col,
  Row,
  Space,
  Tag,
  Tooltip,
  Typography,
  Tabs,
} from 'antd';
import React, { useId } from 'react';
import { ServerAPIProvider } from '../../../components/Manifest';
import { useProjectInfo } from '../../../components/Layout/project-info-context';
import { flattenTreemapData, usePersistedState } from '../../../utils';
import { BundleCards } from './cards';
import styles from './index.module.scss';
import './index.sass';
import {
  AssetTreemapWithFilter,
  TreeNode,
} from 'src/components/Charts/TreeMap';
import { Rspack } from '@rsdoctor/utils/common';
import { TreeGraph } from './tree-graph';

interface WebpackModulesOverallProps {
  cwd: string;
  errors: SDK.ErrorsData;
  summary: Client.RsdoctorClientAssetsSummary;
  entryPoints: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetEntryPoints>;
}

export const WebpackModulesOverallBase: React.FC<
  WebpackModulesOverallProps
> = ({ errors, cwd, summary, entryPoints }) => {
  const [expanded, setExpanded] = usePersistedState(
    'bundle-size-tabs-card-expanded',
    false,
  );
  const cardDomId = useId();
  const expandActionText = expanded ? 'Shrink card' : 'Expand card';
  return (
    <>
      <React.Activity mode={expanded ? 'hidden' : 'visible'}>
        <BundleCards cwd={cwd} errors={errors} summary={summary} />
      </React.Activity>
      <Card
        className={styles.root}
        classNames={{ body: styles.rootBody }}
        id={cardDomId}
      >
        <Tabs
          size="middle"
          className={styles.tabsRoot}
          tabBarExtraContent={{
            right: (
              <Tooltip
                // the content collapses/expands, but the cursor stays at the same position (outside the button now, cause layout has shifted)
                // antd doesn't know that and keeps the tooltip open, so we need to force rerender it on every state change
                key={String(expanded)}
                title={expandActionText}
              >
                <Button
                  // TODO:: does it make sense here? the content basically stays the same and we're actually controlling other elements
                  aria-controls={cardDomId}
                  aria-expanded={expanded}
                  aria-label={expandActionText}
                  onClick={() => setExpanded(!expanded)}
                  icon={expanded ? <ShrinkOutlined /> : <ArrowsAltOutlined />}
                  size="small"
                ></Button>
              </Tooltip>
            ),
          }}
          items={[
            {
              key: 'tree',
              label: (
                <Space>
                  <Typography.Text>Tree Graph</Typography.Text>
                  <Tooltip
                    overlayStyle={{ maxWidth: 380 }}
                    overlayInnerStyle={{ marginLeft: 16, padding: 10 }}
                    color="white"
                    title={
                      <Space direction="vertical" color="white" size="middle">
                        <Row>
                          <Col>
                            <Tag color="cyan" style={{ margin: 0 }}>
                              initial
                            </Tag>
                            <Typography.Text style={{ marginLeft: 4 }}>
                              Identify whether the chunk is an initial chunk.
                            </Typography.Text>
                          </Col>
                        </Row>
                        <Row>
                          <Col>
                            <Tag color="green" style={{ margin: 0 }}>
                              concatenated
                            </Tag>
                            <Typography.Text style={{ marginLeft: 4 }}>
                              Identify whether the module is a concatenated
                              module
                            </Typography.Text>
                            <Tooltip
                              overlayStyle={{ maxWidth: 408 }}
                              placement="bottom"
                              color="white"
                              title={
                                <Space direction="vertical" color="white">
                                  <Row>
                                    <Col>
                                      <Typography.Text strong>
                                        Concatenated Module
                                      </Typography.Text>
                                      <Typography.Text>
                                        : A performance optimization where
                                        multiple modules are merged (or
                                        "hoisted") into a single scope instead
                                        of wrapping each module in separate
                                        function closures. This reduces the
                                        bundle size and improves runtime
                                        performance by minimizing function call
                                        overhead.
                                      </Typography.Text>
                                    </Col>
                                  </Row>
                                </Space>
                              }
                            >
                              <InfoCircleOutlined
                                style={{
                                  color: 'rgba(0,0,0,.45)',
                                  marginLeft: 4,
                                }}
                              />
                            </Tooltip>
                            <Typography.Text>.</Typography.Text>
                          </Col>
                        </Row>
                        <Row>
                          <Col>
                            <Button
                              size="small"
                              icon={<CodepenCircleOutlined />}
                            />
                            <Typography.Text style={{ marginLeft: 4 }}>
                              Open the code.
                            </Typography.Text>
                          </Col>
                        </Row>
                        <Row>
                          <Col>
                            <Button
                              size="small"
                              icon={<DeploymentUnitOutlined />}
                            />
                            <Typography.Text style={{ marginLeft: 4 }}>
                              View the module dependency, that is, module
                              reasons in stats.json.
                            </Typography.Text>
                          </Col>
                        </Row>
                        <Row>
                          <Col>
                            <Tag color={'purple'}>{'Bundled: 15.77 KB'}</Tag>
                            <Typography.Text>
                              The final size of the output files after
                              processing, bundling, and optimization. This is
                              what is delivered to the browser.
                            </Typography.Text>
                          </Col>
                        </Row>
                        <Row>
                          <Col>
                            <Tag color={'orange'}>{'Source: 60.46 KB'}</Tag>
                            <Typography.Text>
                              The original size of your source code files before
                              any processing or transformations. This is the raw
                              size of your code as you wrote it.
                            </Typography.Text>
                          </Col>
                        </Row>
                      </Space>
                    }
                  >
                    <InfoCircleOutlined style={{ color: 'rgba(0,0,0,.45)' }} />
                  </Tooltip>
                </Space>
              ),
              children: (
                <TreeGraph
                  entryPoints={entryPoints}
                  cwd={cwd}
                  summary={summary}
                />
              ),
            },
            {
              key: 'treemap',
              label: 'Treemap',
              children: (
                <ServerAPIProvider api={SDK.ServerAPI.API.GetProjectInfo}>
                  {(data) => {
                    const { isRspack, hasSourceMap } =
                      Rspack.checkSourceMapSupport(data.configs);
                    return (
                      <ServerAPIProvider
                        api={SDK.ServerAPI.API.GetSummaryBundles}
                      >
                        {(data) => {
                          // Filter assets to only show JS (js, cjs, mjs), .bundle, CSS, and HTML files
                          const isTargetFileType = (
                            filePath: string,
                          ): boolean => {
                            const ext =
                              filePath.toLowerCase().split('.').pop() || '';
                            return (
                              ext === 'js' ||
                              ext === 'cjs' ||
                              ext === 'mjs' ||
                              ext === 'bundle' ||
                              ext === 'css' ||
                              ext === 'html'
                            );
                          };

                          const computedTreeData: TreeNode[] = data
                            .filter((item) => isTargetFileType(item.asset.path))
                            .map((item) => ({
                              name: item.asset.path,
                              value: item.asset.size,
                              children: flattenTreemapData(item.modules)
                                .children,
                            }));
                          return (
                            <AssetTreemapWithFilter
                              treeData={computedTreeData}
                              bundledSize={hasSourceMap || isRspack}
                            />
                          );
                        }}
                      </ServerAPIProvider>
                    );
                  }}
                </ServerAPIProvider>
              ),
            },
          ]}
          defaultActiveKey="tree"
        />
      </Card>
    </>
  );
};

export const WebpackModulesOverall: React.FC = () => {
  const { project } = useProjectInfo();

  if (!project) {
    return null;
  }

  const { root, errors } = project;
  return (
    <ServerAPIProvider
      api={SDK.ServerAPI.API.GetAssetsSummary}
      body={{ withFileContent: true }}
    >
      {(summary) => {
        return (
          <ServerAPIProvider api={SDK.ServerAPI.API.GetEntryPoints}>
            {(entryPoints) => (
              <WebpackModulesOverallBase
                cwd={root}
                errors={errors}
                summary={summary}
                entryPoints={entryPoints}
              />
            )}
          </ServerAPIProvider>
        );
      }}
    </ServerAPIProvider>
  );
};
