import React, { useEffect, useState, memo, useMemo, useCallback } from 'react';
import EChartsReactCore from 'echarts-for-react/esm/core';
import * as echarts from 'echarts/core';
import { TreemapChart, type TreemapSeriesOption } from 'echarts/charts';
import {
  TooltipComponent,
  TitleComponent,
  type TooltipComponentOption,
  type TitleComponentOption,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { Alert, Checkbox, Radio, Input } from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  SearchOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
} from '@ant-design/icons';
import type { ComposeOption, EChartsType } from 'echarts/core';
import { formatSize } from 'src/utils';
import { SDK } from '@rsdoctor/types';
import { ServerAPIProvider } from 'src/components/Manifest';
import { ModuleAnalyzeComponent } from '../../pages/ModuleAnalyze';
import Styles from './treemap.module.scss';
import { TREE_COLORS } from './constants';
import type {
  CallbackDataParams,
  ECElementEvent,
} from 'echarts/types/dist/shared';

type TreeMapOption = ComposeOption<
  TreemapSeriesOption | TooltipComponentOption | TitleComponentOption
>;

type TreemapDataNode = NonNullable<TreemapSeriesOption['data']>[number] & {
  path?: string;
  sourceSize?: number;
  bundledSize?: number;
  gzipSize?: number;
  moduleId?: string | number;
};

echarts.use([TreemapChart, TooltipComponent, TitleComponent, CanvasRenderer]);

export type TreeNode = {
  name: string;
  value?: number;
  children?: TreeNode[];
  path?: string;
  sourceSize?: number;
  bundledSize?: number;
  gzipSize?: number;
  id?: string | number;
};

export type SizeType = 'stat' | 'parsed' | 'gzip' | 'value';

interface TreeMapProps {
  treeData: TreeNode[];
  sizeType: SizeType;
  style?: React.CSSProperties;
  onChartClick?: (params: ECElementEvent) => void;
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

function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const [rs, gs, bs] = [r, g, b].map((val) => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function isDarkColor(hex: string): boolean {
  return getLuminance(hex) < 0.4;
}

function getLevelOption() {
  return [
    {
      itemStyle: {
        borderWidth: 0,
        gapWidth: 4,
        gapColor: '#ffffff',
      },
    },
    {
      itemStyle: {
        borderColorAlpha: [1, 0.3],
        borderWidth: 5,
        gapWidth: 4,
        gapColor: '#ffffff',
      },
      upperLabel: {
        show: true,
        color: '#ffffff',
        fontSize: 12,
        height: 30,
      },
    },
  ];
}

const TreeMapInner: React.FC<
  TreeMapProps & { forwardedRef?: React.Ref<EChartsReactCore> }
> = memo(
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
    const [option, setOption] = useState<TreeMapOption | null>(null);
    const chartRef = React.useRef<EChartsReactCore | null>(null);
    const chartDataRef = React.useRef<TreemapDataNode[]>([]);
    const clickTimeoutRef = React.useRef<number | null>(null);

    useEffect(() => {
      if (forwardedRef && chartRef.current) {
        if (typeof forwardedRef === 'function') {
          forwardedRef(chartRef.current);
        } else {
          (
            forwardedRef as React.MutableRefObject<EChartsReactCore | null>
          ).current = chartRef.current;
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
        chunkPath?: string,
      ): TreemapDataNode {
        const baseColor =
          parentColor || TREE_COLORS[index % TREE_COLORS.length];

        // For level 0 (chunk level), use the chunk's path/name as chunkPath
        const currentChunkPath =
          level === 0 ? node.path || node.name || '' : chunkPath || '';

        const children = node.children?.map((c, childIndex) =>
          convert(
            c,
            index,
            level + 1,
            baseColor,
            childIndex,
            node.children?.length || 0,
            currentChunkPath,
          ),
        );

        let val = 0;
        if (sizeType === 'stat') val = node.sourceSize || 0;
        else if (sizeType === 'parsed') val = node.bundledSize || 0;
        else if (sizeType === 'gzip') val = node.gzipSize || 0;
        else if (sizeType === 'value') val = node.value || 0;

        if (!val && node.value) val = node.value;

        // Include chunk path in nodeId for non-root nodes to ensure uniqueness across chunks
        const nodeIdString =
          level === 0
            ? node.path || node.name || ''
            : `${currentChunkPath}::${node.path || node.name || ''}`;
        const nodeId = hashString(nodeIdString);
        const isHighlighted = highlightNodeId === nodeId;

        const baseColorRatio =
          level === 0 ? 1 : Math.max(0.35, 1 - level * 0.15);
        const baseBorderRatio =
          level === 0 ? 1 : Math.max(0.4, 1 - level * 0.15);

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

        const isDark = isDarkColor(nodeColor);
        const textColor = isDark ? '#ffffff' : '#000000';
        const textBorderColor = isDark
          ? 'rgba(255, 255, 255, 0.2)'
          : 'rgba(0, 0, 0, 0.1)';

        const result: TreemapDataNode = {
          id: nodeId,
          name: node.name,
          value: val,
          path: node.path || node.name,
          sourceSize:
            node.sourceSize ?? (sizeType === 'stat' ? val : undefined),
          bundledSize:
            node.bundledSize ?? (sizeType === 'parsed' ? val : undefined),
          gzipSize: node.gzipSize ?? (sizeType === 'gzip' ? val : undefined),
          moduleId: node.id,
          itemStyle: {
            borderWidth: isHighlighted ? 4 : 1,
            color: nodeColor,
            borderColor: nodeBorderColor,
            ...(level === 0 && { gapWidth: 2 }),
          },
          label: {
            show: true,
            color: textColor,
            textBorderColor: textBorderColor,
            textBorderWidth: 1,
          },
          upperLabel:
            level === 0
              ? undefined
              : {
                  show: true,
                  color: textColor,
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
        } else {
          // Keep the same color on hover/click to prevent color change
          result.emphasis = {
            itemStyle: {
              color: nodeColor,
              borderColor: nodeBorderColor,
              borderWidth: isHighlighted ? 4 : 1,
            },
          };
        }

        return result;
      }

      const data = treeData
        .map((item, index) =>
          convert(item, index, 0, undefined, index, treeData.length, undefined),
        )
        .filter(
          (item) =>
            (typeof item.value === 'number' ? item.value > 0 : false) ||
            (item.children && item.children.length > 0),
        );

      chartDataRef.current = data;

      setOption({
        color: TREE_COLORS,
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
          position: function (pos, _params, _dom, _rect, size) {
            const obj: { top: number; left?: number; right?: number } = {
              top: pos[1] + 10,
            };
            if (pos[0] < size.viewSize[0] / 2) {
              obj.left = pos[0] + 10;
            } else {
              obj.right = size.viewSize[0] - pos[0] + 10;
            }
            return obj;
          } as TooltipComponentOption['position'],
          formatter: function (
            info: CallbackDataParams & { data?: TreemapDataNode },
          ) {
            const node = info.data || {};
            let path =
              typeof node.path === 'string'
                ? node.path
                : typeof node.name === 'string'
                  ? node.name
                  : String(node.name ?? '');

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

            const sourceSize =
              typeof node.sourceSize === 'number' && node.sourceSize > 0
                ? node.sourceSize
                : typeof node.value === 'number' &&
                    node.value > 0 &&
                    sizeType === 'stat'
                  ? node.value
                  : undefined;
            const bundledSize =
              typeof node.bundledSize === 'number' && node.bundledSize > 0
                ? node.bundledSize
                : undefined;
            const gzipSize =
              typeof node.gzipSize === 'number' && node.gzipSize > 0
                ? node.gzipSize
                : undefined;

            function makeRow(label: string, value: string, color: string) {
              return `<div class="${Styles['tooltip-row']}">
                    <span class="${Styles['tooltip-label']}" style="color: ${color};">${label}</span>
                    <span style="color: ${color};">${value}</span>
                </div>`;
            }

            const rows = [];
            if (sourceSize !== undefined && sourceSize > 0) {
              rows.push(
                makeRow('Stat size', formatSize(sourceSize), '#52c41a'),
              );
            }
            if (bundledSize !== undefined && bundledSize > 0) {
              rows.push(
                makeRow('Parsed size', formatSize(bundledSize), '#d96420'),
              );
            }
            if (gzipSize !== undefined && gzipSize > 0) {
              rows.push(
                makeRow('Gzipped size', formatSize(gzipSize), '#1677ff'),
              );
            }

            return `
                <div style="font-family: sans-serif; font-size: 12px; line-height: 1.5;">
                  <div style="margin-bottom: 6px; max-width: 400px; word-wrap: break-word; overflow-wrap: break-word; word-break: break-all; white-space: normal; color: rgba(0, 0, 0, 0.8);">${echarts.format.encodeHTML(path)}</div>
                  ${rows.join('')}
                </div>
              `;
          },
        } as TooltipComponentOption,
        series: [
          {
            type: 'treemap',
            itemStyle: {
              gapColor: '#ffffff',
            },
            label: {
              show: true,
              formatter: '{b}',
              fontSize: 12,
              position: 'inside',
              fontWeight: 'normal',
              textBorderWidth: 1,
              padding: [4, 8, 4, 8],
            },
            upperLabel: {
              show: true,
              height: 30,
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
            zoomToNodeRatio: 0.7,
            animationDurationUpdate: 500,
            width: '100%',
            height: '100%',
            top: -10,
            bottom: 30,
            left: 0,
            right: 0,
            zoomLimit: {
              min: 0.5,
              max: 5,
            },
          } as TreemapSeriesOption,
        ],
      });
    }, [treeData, sizeType, highlightNodeId, rootPath]);

    useEffect(() => {
      if (centerNodeId && chartRef.current && option) {
        const chartInstance =
          chartRef.current.getEchartsInstance() as unknown as EChartsType;
        if (chartInstance) {
          const findNodeInfo = (
            data: TreemapDataNode[],
            targetId: number,
            path: string[] = [],
          ): { name: string; path: string[] } | null => {
            for (const item of data) {
              const itemName =
                typeof item.name === 'string'
                  ? item.name
                  : String(item.name ?? '');
              const currentPath = [...path, itemName];
              if (item.id === targetId) {
                return { name: itemName, path: currentPath };
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
            const nodeName = nodeInfo.name;

            try {
              chartInstance.dispatchAction({
                type: 'highlight',
                seriesIndex: 0,
                name: nodeName,
              });
            } catch (e) {
              console.error('Failed to highlight node with name:', nodeName, e);
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
                  name: nodeName,
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

    useEffect(() => {
      return () => {
        if (clickTimeoutRef.current) {
          window.clearTimeout(clickTimeoutRef.current);
        }
      };
    }, []);

    return option ? (
      <div className={Styles['chart-container']} style={style}>
        <Alert
          message="If parsed size lacks detailed module information, you can enable sourceMap when RSDOCTOR = true. This is because Rsdoctor relies on SourceMap to obtain Parsed Size. Rspack provides SourceMap information to Rsdoctor by default without affecting the build output."
          type="info"
          showIcon
          style={{ marginBottom: 0 }}
        />
        <EChartsReactCore
          ref={chartRef}
          option={option}
          echarts={echarts}
          onEvents={{
            click: (params: ECElementEvent) => {
              // Delay to differentiate from double-click; only zoom on single click
              if (clickTimeoutRef.current) {
                window.clearTimeout(clickTimeoutRef.current);
              }
              clickTimeoutRef.current = window.setTimeout(() => {
                if (chartRef.current) {
                  const instance =
                    chartRef.current.getEchartsInstance() as unknown as EChartsType;
                  const data = params?.data as TreemapDataNode | undefined;
                  if (instance && data?.id !== undefined) {
                    instance.dispatchAction({
                      type: 'treemapZoomToNode',
                      seriesIndex: 0,
                      targetNodeId: String(data.id),
                    });
                  }
                }
              }, 180);
            },
            dblclick: (params: ECElementEvent) => {
              // Double click: cancel pending single-click action and trigger analyze
              if (clickTimeoutRef.current) {
                window.clearTimeout(clickTimeoutRef.current);
                clickTimeoutRef.current = null;
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

export const TreeMap = React.forwardRef<EChartsReactCore, TreeMapProps>(
  (props, ref) => <TreeMapInner {...props} forwardedRef={ref} />,
);

export const AssetTreemapWithFilter: React.FC<{
  treeData: TreeNode[];
  onChartClick?: (params: ECElementEvent) => void;
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
  onChartClick?: (params: ECElementEvent) => void;
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
  const [moduleId, setModuleId] = useState<string | number>('');
  const [showAnalyze, setShowAnalyze] = useState(false);
  const [chunkSearchQuery, setChunkSearchQuery] = useState('');

  const chartRef = React.useRef<EChartsReactCore>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleChartClick = useCallback(
    (params: ECElementEvent) => {
      onChartClick?.(params);
      const data = params.data as TreemapDataNode | undefined;
      const moduleId = data?.moduleId;
      if (moduleId !== undefined) {
        setModuleId(moduleId);
        setShowAnalyze(true);
      }
    },
    [onChartClick],
  );

  const enterFullscreen = useCallback(() => {
    if (containerRef.current) {
      const el = containerRef.current as HTMLElement & {
        webkitRequestFullscreen?: () => void;
        mozRequestFullScreen?: () => void;
        msRequestFullscreen?: () => void;
      };
      if (el.requestFullscreen) {
        el.requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch((err: unknown) =>
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

  const filteredTreeData = useMemo(() => {
    let filtered = treeData.filter((item) => checkedAssets.includes(item.name));

    if (chunkSearchQuery.trim()) {
      const searchLower = chunkSearchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(searchLower),
      );
    }

    return filtered;
  }, [treeData, checkedAssets, chunkSearchQuery]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const regex = new RegExp(searchQuery, 'i');
    const results: Array<{ path: string; nodeId: number }> = [];

    const collectMatchingPaths = (node: TreeNode, chunkPath?: string) => {
      // For chunk level (root of filteredTreeData), use its path/name as chunkPath
      const currentChunkPath = chunkPath || node.path || node.name || '';

      if (node.path && regex.test(node.path)) {
        // Use the same nodeId calculation as in convert function
        const nodeIdString = chunkPath
          ? `${chunkPath}::${node.path}`
          : node.path;
        const nodeId = hashString(nodeIdString);
        results.push({ path: node.path, nodeId });
      }
      if (node.children) {
        node.children.forEach((child) =>
          collectMatchingPaths(child, currentChunkPath),
        );
      }
    };

    filteredTreeData.forEach((chunk) => collectMatchingPaths(chunk));
    return results;
  }, [filteredTreeData, searchQuery]);

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
            <h4>Show chunks</h4>
            <Input
              placeholder="Search chunks"
              value={chunkSearchQuery}
              onChange={(e) => setChunkSearchQuery(e.target.value)}
              suffix={<SearchOutlined style={{ color: '#ccc' }} />}
              allowClear
              size="small"
              style={{ marginBottom: 8 }}
            />
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
            <div
              className={Styles['chunk-list']}
              style={{ maxHeight: 180, overflowY: 'auto' }}
            >
              {assetNames
                .filter((name) =>
                  name.toLowerCase().includes(chunkSearchQuery.toLowerCase()),
                )
                .map((name) => (
                  <div
                    key={name}
                    className={Styles['chunk-item']}
                    style={{ height: 15, lineHeight: '15px' }}
                  >
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
        </div>
      </div>

      <div className={Styles['chart-wrapper']}>
        <TreeMap
          ref={chartRef}
          treeData={filteredTreeData}
          sizeType={sizeType}
          onChartClick={handleChartClick}
          highlightNodeId={highlightNodeId}
          centerNodeId={centerNodeId}
          rootPath={rootPath}
          style={{ width: '100%', height: '100%' }}
        />
        {moduleId ? (
          <ServerAPIProvider
            api={SDK.ServerAPI.API.GetAllModuleGraph}
            body={{}}
          >
            {(modules) => (
              <ModuleAnalyzeComponent
                cwd={rootPath}
                moduleId={moduleId}
                modules={modules}
                show={showAnalyze}
                setShow={setShowAnalyze}
              />
            )}
          </ServerAPIProvider>
        ) : null}
      </div>
    </div>
  );
};
