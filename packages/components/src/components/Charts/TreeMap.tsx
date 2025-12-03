import React, { useEffect, useState, memo, useMemo, useCallback } from 'react';
import EChartsReactCore from 'echarts-for-react/esm/core';
import * as echarts from 'echarts/core';
import { TreemapChart } from 'echarts/charts';
import { TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { Checkbox, Radio, Input } from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  SearchOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
} from '@ant-design/icons';
import { formatSize } from 'src/utils';
import { SDK } from '@rsdoctor/types';
import { ServerAPIProvider } from 'src/components/Manifest';
import Styles from './treemap.module.scss';
import { TREE_COLORS } from './constants';

echarts.use([TreemapChart, TooltipComponent, CanvasRenderer]);

export type TreeNode = {
  name: string;
  value?: number;
  children?: TreeNode[];
  path?: string;
  sourceSize?: number;
  bundledSize?: number;
  gzipSize?: number;
};

export type SizeType = 'stat' | 'parsed' | 'gzip' | 'value';

interface TreeMapProps {
  treeData: TreeNode[];
  sizeType: SizeType;
  style?: React.CSSProperties;
  onChartClick?: (params: any) => void;
  highlightNodeId?: number;
  centerNodeId?: number;
  rootPath?: string;
}

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
  }
  return hash >>> 0;
}

function blendWithWhite(hex: string, ratio: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const blendedR = Math.round(r * ratio + 255 * (1 - ratio));
  const blendedG = Math.round(g * ratio + 255 * (1 - ratio));
  const blendedB = Math.round(b * ratio + 255 * (1 - ratio));

  return `#${blendedR.toString(16).padStart(2, '0')}${blendedG.toString(16).padStart(2, '0')}${blendedB.toString(16).padStart(2, '0')}`;
}

function getLevelOption() {
  return [
    {
      itemStyle: {
        borderWidth: 0,
        gapWidth: 2,
      },
    },
    {
      itemStyle: {
        borderColorAlpha: [1, 0.3],
        borderWidth: 5,
        gapWidth: 1,
      },
      upperLabel: {
        show: true,
        color: '#ffffff',
        fontSize: 14,
        height: 30,
      },
      emphasis: {
        itemStyle: {
          borderColor: '#ccc',
        },
      },
    },
  ];
}

const TreeMapInner: React.FC<TreeMapProps & { forwardedRef?: React.Ref<any> }> =
  memo(
    ({
      treeData,
      sizeType,
      style,
      onChartClick,
      forwardedRef,
      highlightNodeId,
      centerNodeId,
      rootPath,
    }) => {
      const [option, setOption] = useState<any>(null);
      const chartRef = React.useRef<any>(null);
      const chartDataRef = React.useRef<any[]>([]);

      useEffect(() => {
        if (forwardedRef && chartRef.current) {
          if (typeof forwardedRef === 'function') {
            forwardedRef(chartRef.current);
          } else {
            (forwardedRef as React.MutableRefObject<any>).current =
              chartRef.current;
          }
        }
      }, [forwardedRef, chartRef.current]);
      useEffect(() => {
        if (!treeData) return;
        function convert(
          node: TreeNode,
          index = 0,
          level = 0,
          parentColor?: string,
          siblingIndex = 0,
          siblingCount = 1,
        ): any {
          const baseColor =
            parentColor || TREE_COLORS[index % TREE_COLORS.length];

          const children = node.children?.map((c, childIndex) =>
            convert(
              c,
              index,
              level + 1,
              baseColor,
              childIndex,
              node.children?.length || 0,
            ),
          );

          let val = 0;
          if (sizeType === 'stat') val = node.sourceSize || 0;
          else if (sizeType === 'parsed') val = node.bundledSize || 0;
          else if (sizeType === 'gzip') val = node.gzipSize || 0;
          else if (sizeType === 'value') val = node.value || 0;

          if (!val && node.value) val = node.value;

          const nodeId = node.path
            ? hashString(node.path)
            : hashString(node.name || '');
          const isHighlighted = highlightNodeId === nodeId;

          const baseColorRatio =
            level === 0 ? 1 : Math.max(0.2, 1 - level * 0.2);
          const baseBorderRatio =
            level === 0 ? 1 : Math.max(0.3, 1 - level * 0.25);

          const siblingGradientRange = 0.15;
          const siblingRatio =
            siblingCount > 1
              ? 1 - (siblingIndex / (siblingCount - 1)) * siblingGradientRange
              : 1;

          const colorRatio = baseColorRatio * siblingRatio;
          const borderRatio = baseBorderRatio * siblingRatio;

          const nodeColor = isHighlighted
            ? '#fff5f5'
            : level === 0
              ? blendWithWhite(baseColor, 0.8)
              : blendWithWhite(baseColor, colorRatio);

          const nodeBorderColor = isHighlighted
            ? '#ff4d4f'
            : level === 0
              ? baseColor
              : blendWithWhite(baseColor, borderRatio);

          const result: any = {
            id: nodeId,
            name: node.name,
            value: val,
            path: node.path || node.name,
            sourceSize: node.sourceSize ?? (sizeType === 'stat' ? val : 0),
            bundledSize: node.bundledSize ?? (sizeType === 'parsed' ? val : 0),
            gzipSize: node.gzipSize ?? (sizeType === 'gzip' ? val : 0),
            itemStyle: {
              borderWidth: isHighlighted ? 4 : 1,
              color: nodeColor,
              borderColor: nodeBorderColor,
              ...(level === 0 && { gapWidth: 2 }),
            },
          };

          if (children && children.length > 0) {
            result.children = children;
          }

          if (isHighlighted) {
            result.emphasis = {
              itemStyle: {
                borderColor: '#ff4d4f',
                borderWidth: 4,
                color: '#fff5f5',
              },
            };
          }

          return result;
        }

        const data = treeData
          .map((item, index) =>
            convert(item, index, 0, undefined, index, treeData.length),
          )
          .filter(
            (item) =>
              item.value > 0 || (item.children && item.children.length > 0),
          );

        chartDataRef.current = data;

        setOption({
          color: TREE_COLORS,
          title: {
            text: 'Rsdoctor TreeMap',
            left: 'center',
            top: 10,
            textStyle: {
              fontSize: 16,
              fontWeight: 'bold',
              color: 'rgba(0, 0, 0, 0.8)',
            },
          },
          tooltip: {
            padding: 10,
            backgroundColor: '#fff',
            borderColor: '#eee',
            borderWidth: 1,
            textStyle: {
              color: 'rgba(0, 0, 0, 0.8)',
            },
            confine: true,
            extraCssText: 'max-width: 450px; word-wrap: break-word;',
            position: function (
              pos: any,
              _params: any,
              _dom: any,
              _rect: any,
              size: any,
            ) {
              const obj = { top: pos[1] + 10 };
              if (pos[0] < size.viewSize[0] / 2) {
                (obj as any).left = pos[0] + 10;
              } else {
                (obj as any).right = size.viewSize[0] - pos[0] + 10;
              }
              return obj;
            },
            formatter: function (info: any) {
              const node = info.data || {};
              const name = node.name;
              let path = node.path || name;

              if (rootPath && path) {
                const normalizedRoot = rootPath
                  .replace(/\\/g, '/')
                  .replace(/\/$/, '');
                const normalizedPath = path.replace(/\\/g, '/');
                if (normalizedPath.startsWith(normalizedRoot + '/')) {
                  path = normalizedPath.slice(normalizedRoot.length + 1);
                } else if (normalizedPath === normalizedRoot) {
                  path = '';
                }
              }

              const sourceSize = node.sourceSize || node.value;
              const bundledSize = node.bundledSize;
              const gzipSize = node.gzipSize;

              function makeRow(label: string, value: string, color: string) {
                return `<div class="${Styles['tooltip-row']}">
                    <span class="${Styles['tooltip-label']}" style="color: ${color};">${label}</span>
                    <span style="color: ${color};">${value}</span>
                </div>`;
              }

              const rows = [];
              if (sourceSize !== undefined) {
                rows.push(
                  makeRow('Stat size', formatSize(sourceSize), '#52c41a'),
                ); // Green
              }
              if (bundledSize !== undefined) {
                rows.push(
                  makeRow('Parsed size', formatSize(bundledSize), '#fadb14'),
                ); // Yellow
              }
              if (gzipSize !== undefined) {
                rows.push(
                  makeRow('Gzipped size', formatSize(gzipSize), '#1677ff'),
                ); // Blue
              }

              return `
                <div style="font-family: sans-serif; font-size: 12px; line-height: 1.5;">
                  <div style="margin-bottom: 6px; max-width: 400px; word-wrap: break-word; overflow-wrap: break-word; word-break: break-all; white-space: normal; color: rgba(0, 0, 0, 0.8);">${echarts.format.encodeHTML(path)}</div>
                  ${rows.join('')}
                </div>
              `;
            },
          },
          series: [
            {
              type: 'treemap',
              label: {
                show: true,
                formatter: '{b}',
                fontSize: 12,
                color: '#000',
                position: 'inside',
                fontWeight: 'normal',
                textBorderColor: '#fff',
                textBorderWidth: 2,
                padding: [4, 8, 4, 8],
              },
              upperLabel: {
                show: true,
                height: 30,
                color: '#000',
                fontSize: 12,
                fontWeight: 'normal',
                padding: [0, 0, 0, 4],
              },
              levels: getLevelOption(),
              data: data,
              breadcrumb: {
                show: true,
                left: 'center',
                top: 'bottom',
                height: 22,
                emptyItemWidth: 25,
                itemStyle: {
                  color: '#999',
                  borderColor: 'transparent',
                  borderWidth: 0,
                  borderRadius: 0,
                },
                emphasis: {
                  itemStyle: {
                    color: '#333',
                  },
                },
                textStyle: {
                  fontFamily: 'sans-serif',
                  fontSize: 12,
                  color: '#666',
                },
              },
              roam: true,
              nodeClick: false,
              zoomToNodeRatio: 0.5,
              animationDurationUpdate: 500,
              width: '100%',
              height: '100%',
              top: 40,
              bottom: 30,
              left: 0,
              right: 0,
            },
          ],
        });
      }, [treeData, sizeType, highlightNodeId, rootPath]);

      useEffect(() => {
        if (centerNodeId && chartRef.current && option) {
          const chartInstance = chartRef.current.getEchartsInstance();
          if (chartInstance) {
            const findNodeInfo = (
              data: any[],
              targetId: number,
              path: string[] = [],
            ): { name: string; path: string[] } | null => {
              for (const item of data) {
                const currentPath = [...path, item.name];
                if (item.id === targetId) {
                  return { name: item.name, path: currentPath };
                }
                if (item.children) {
                  const found = findNodeInfo(
                    item.children,
                    targetId,
                    currentPath,
                  );
                  if (found) return found;
                }
              }
              return null;
            };

            setTimeout(() => {
              const nodeInfo = findNodeInfo(chartDataRef.current, centerNodeId);
              if (!nodeInfo) return;

              try {
                chartInstance.dispatchAction({
                  type: 'highlight',
                  seriesIndex: 0,
                  name: nodeInfo.name,
                });
              } catch (e) {
                console.error(
                  'Failed to highlight node with name:',
                  nodeInfo.name,
                  e,
                );
              }

              const zoomStrategies: Array<() => void> = [
                () =>
                  chartInstance.dispatchAction({
                    type: 'treemapZoomToNode',
                    seriesIndex: 0,
                    targetNodeId: String(centerNodeId),
                  }),
                () =>
                  chartInstance.dispatchAction({
                    type: 'treemapZoomToNode',
                    seriesIndex: 0,
                    name: nodeInfo.name,
                  }),
                () =>
                  chartInstance.dispatchAction({
                    type: 'treemapZoomToNode',
                    seriesIndex: 0,
                    name: nodeInfo.path.join('/'),
                  }),
                () =>
                  nodeInfo.path.length > 0 &&
                  chartInstance.dispatchAction({
                    type: 'treemapZoomToNode',
                    seriesIndex: 0,
                    name: nodeInfo.path[nodeInfo.path.length - 1],
                  }),
              ];

              for (const strategy of zoomStrategies) {
                try {
                  strategy();
                  return;
                } catch (e) {
                  console.error(
                    'Failed to zoom to node with id:',
                    centerNodeId,
                    e,
                  );
                }
              }

              console.warn('Failed to zoom to node with id:', centerNodeId);
            }, 200);
          }
        }
      }, [centerNodeId, option]);

      return option ? (
        <div className={Styles['chart-container']} style={style}>
          <EChartsReactCore
            ref={chartRef}
            option={option}
            echarts={echarts}
            onEvents={{
              click: (params: any) => {
                if (chartRef.current) {
                  const instance = chartRef.current.getEchartsInstance();
                  if (instance && params?.data?.id) {
                    instance.dispatchAction({
                      type: 'treemapZoomToNode',
                      seriesIndex: 0,
                      targetNodeId: String(params.data.id),
                    });
                  }
                }
                onChartClick?.(params);
              },
            }}
            style={{
              width: '100%',
              height: '100%',
            }}
          />
        </div>
      ) : null;
    },
  );

export const TreeMap = React.forwardRef<any, TreeMapProps>((props, ref) => (
  <TreeMapInner {...props} forwardedRef={ref} />
));

export const AssetTreemapWithFilter: React.FC<{
  treeData: TreeNode[];
  onChartClick?: (params: any) => void;
  bundledSize?: boolean;
}> = ({ treeData, onChartClick, bundledSize = true }) => {
  return (
    <ServerAPIProvider api={SDK.ServerAPI.API.GetProjectInfo}>
      {(projectInfo) => {
        return (
          <AssetTreemapWithFilterInner
            treeData={treeData}
            onChartClick={onChartClick}
            bundledSize={bundledSize}
            rootPath={projectInfo.root}
          />
        );
      }}
    </ServerAPIProvider>
  );
};

const AssetTreemapWithFilterInner: React.FC<{
  treeData: TreeNode[];
  onChartClick?: (params: any) => void;
  bundledSize?: boolean;
  rootPath: string;
}> = ({ treeData, onChartClick, bundledSize = true, rootPath }) => {
  const assetNames = useMemo(
    () => treeData.map((item) => item.name),
    [treeData],
  );

  const [checkedAssets, setCheckedAssets] = useState<string[]>(assetNames);
  const [collapsed, setCollapsed] = useState(false);
  const [sizeType, setSizeType] = useState<SizeType>(
    bundledSize ? 'parsed' : 'stat',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [highlightNodeId, setHighlightNodeId] = useState<number | undefined>();
  const [centerNodeId, setCenterNodeId] = useState<number | undefined>();

  const chartRef = React.useRef<any>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const enterFullscreen = useCallback(() => {
    if (containerRef.current) {
      const el = containerRef.current as any;
      if (el.requestFullscreen) {
        el.requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch((err: any) =>
            console.error('Failed to enter fullscreen:', err),
          );
      } else if (el.webkitRequestFullscreen) {
        try {
          el.webkitRequestFullscreen();
          setIsFullscreen(true);
        } catch (err) {
          console.error('Failed to enter fullscreen (webkit):', err);
        }
      } else if (el.mozRequestFullScreen) {
        try {
          el.mozRequestFullScreen();
          setIsFullscreen(true);
        } catch (err) {
          console.error('Failed to enter fullscreen (moz):', err);
        }
      } else if (el.msRequestFullscreen) {
        try {
          el.msRequestFullscreen();
          setIsFullscreen(true);
        } catch (err) {
          console.error('Failed to enter fullscreen (ms):', err);
        }
      } else {
        console.error('Fullscreen API is not supported in this browser.');
      }
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    document
      .exitFullscreen()
      .then(() => setIsFullscreen(false))
      .catch((err) => console.error('Failed to exit fullscreen:', err));
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const regex = new RegExp(searchQuery, 'i');
    const results: Array<{ path: string; nodeId: number }> = [];

    const collectMatchingPaths = (node: TreeNode) => {
      if (node.path && regex.test(node.path)) {
        const nodeId = hashString(node.path);
        results.push({ path: node.path, nodeId });
      }
      if (node.children) {
        node.children.forEach(collectMatchingPaths);
      }
    };

    treeData.forEach(collectMatchingPaths);
    return results;
  }, [treeData, searchQuery]);

  const filteredTreeData = useMemo(() => {
    let filtered = treeData.filter((item) => checkedAssets.includes(item.name));

    return filtered;
  }, [treeData, checkedAssets]);

  const handleSearchResultClick = useCallback((nodeId: number) => {
    setHighlightNodeId(nodeId);
    setCenterNodeId(nodeId);
  }, []);

  const removeRootPath = useCallback(
    (filepath: string): string => {
      if (!rootPath || !filepath) return filepath;
      const normalizedRoot = rootPath.replace(/\\/g, '/').replace(/\/$/, '');
      const normalizedPath = filepath.replace(/\\/g, '/');

      if (normalizedPath.startsWith(normalizedRoot + '/')) {
        return normalizedPath.slice(normalizedRoot.length + 1);
      } else if (normalizedPath === normalizedRoot) {
        return '';
      }
      return filepath;
    },
    [rootPath],
  );

  const getSize = useCallback((node: TreeNode, type?: SizeType) => {
    if (type === 'stat') return node.sourceSize || 0;
    if (type === 'parsed') return node.bundledSize || 0;
    if (type === 'gzip') return node.gzipSize || 0;
    if (type === 'value') return node.value || 0;
    if (node.value) return node.value;
    return 0;
  }, []);

  const calculateNodeTotalSize = useCallback(
    (node: TreeNode, type: SizeType): number => {
      let size = getSize(node, type);

      if (node.children && node.children.length > 0) {
        const childrenSize = node.children.reduce(
          (sum, child) => sum + calculateNodeTotalSize(child, type),
          0,
        );
        if (size === 0 || (!node.path && childrenSize > 0)) {
          size = childrenSize;
        }
      }

      return size;
    },
    [getSize],
  );

  const getChunkSize = useCallback(
    (name: string, type?: SizeType) => {
      const node = treeData.find((n) => n.name === name);
      if (!node) return 0;
      const sizeTypeToUse = type || sizeType;
      return calculateNodeTotalSize(node, sizeTypeToUse);
    },
    [treeData, sizeType, calculateNodeTotalSize],
  );

  return (
    <div className={Styles.treemap} ref={containerRef}>
      <button
        className={Styles['fullscreen-button']}
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        {isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
      </button>

      <div className={`${Styles.sidebar} ${collapsed ? Styles.collapsed : ''}`}>
        <div
          className={`${Styles['sidebar-toggle']} ${collapsed ? Styles.collapsed : ''}`}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <RightOutlined /> : <LeftOutlined />}
        </div>
        <div className={Styles['sidebar-content']}>
          <div>
            <h4>Treemap sizes</h4>
            <Radio.Group
              value={sizeType}
              onChange={(e) => setSizeType(e.target.value)}
              size="small"
              buttonStyle="solid"
            >
              <Radio.Button value="stat">Stat</Radio.Button>
              <Radio.Button value="parsed">Parsed</Radio.Button>
              <Radio.Button value="gzip">Gzipped</Radio.Button>
            </Radio.Group>
          </div>

          <div>
            <h4>Search modules</h4>
            <Input
              placeholder="Enter regexp"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightNodeId(undefined);
                setCenterNodeId(undefined);
              }}
              suffix={<SearchOutlined style={{ color: '#ccc' }} />}
              allowClear
              size="small"
            />
            {searchQuery.trim() && searchResults.length > 0 && (
              <div className={Styles['search-results']}>
                <div className={Styles['search-results-header']}>
                  Found {searchResults.length} file
                  {searchResults.length > 1 ? 's' : ''}
                </div>
                <div className={Styles['search-results-list']}>
                  {searchResults.map((result, index) => {
                    const displayPath = removeRootPath(result.path);
                    return (
                      <div
                        key={index}
                        className={Styles['search-result-item']}
                        onClick={() => handleSearchResultClick(result.nodeId)}
                        title={result.path}
                      >
                        {displayPath || result.path}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {searchQuery.trim() && searchResults.length === 0 && (
              <div className={Styles['search-results-empty']}>
                No files found matching "{searchQuery}"
              </div>
            )}
          </div>

          <div>
            <h4>Show chunks</h4>
            <Checkbox
              indeterminate={
                checkedAssets.length > 0 &&
                checkedAssets.length < assetNames.length
              }
              checked={checkedAssets.length === assetNames.length}
              onChange={(e) =>
                setCheckedAssets(e.target.checked ? assetNames : [])
              }
              className={Styles['all-none-checkbox']}
            >
              All
            </Checkbox>
            <div className={Styles['chunk-list']}>
              {assetNames.map((name) => (
                <div key={name} className={Styles['chunk-item']}>
                  <Checkbox
                    checked={checkedAssets.includes(name)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCheckedAssets([...checkedAssets, name]);
                      } else {
                        setCheckedAssets(
                          checkedAssets.filter((a) => a !== name),
                        );
                      }
                    }}
                  >
                    <span title={name}>{name}</span>
                  </Checkbox>
                  <span className={Styles['size-tag']}>
                    {formatSize(getChunkSize(name, 'value'))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={Styles['chart-wrapper']}>
        <TreeMap
          ref={chartRef}
          treeData={filteredTreeData}
          sizeType={sizeType}
          onChartClick={onChartClick}
          highlightNodeId={highlightNodeId}
          centerNodeId={centerNodeId}
          rootPath={rootPath}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
};
