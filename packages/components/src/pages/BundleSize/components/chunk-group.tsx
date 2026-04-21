import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import ReactEChartsCore from 'echarts-for-react/esm/core';
import * as echarts from 'echarts/core';
import { GraphChart, type GraphSeriesOption } from 'echarts/charts';
import {
  TooltipComponent,
  type TooltipComponentOption,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { ComposeOption } from 'echarts/core';
import { SearchOutlined } from '@ant-design/icons';
import { SDK } from '@rsdoctor/types';
import {
  Alert,
  Card,
  Col,
  Empty,
  Input,
  Row,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { formatSize } from 'src/utils';

echarts.use([GraphChart, TooltipComponent, CanvasRenderer]);

type ChunkGroupGraphOption = ComposeOption<
  GraphSeriesOption | TooltipComponentOption
>;

type GraphLayout = {
  height: number;
  positions: Map<
    string,
    {
      x: number;
      y: number;
    }
  >;
};

type ChunkGroupGraphPanelProps = {
  report?: SDK.ChunkGroupGraphData;
};

const ENTRY_COLOR = '#1f6feb';
const ENTRY_BORDER = '#58a6ff';
const ASYNC_COLOR = '#238636';
const ASYNC_BORDER = '#7ee787';
const HIGHLIGHT_COLOR = '#f59e0b';
const WARNING_COLOR = '#f59e0b';
const DANGER_COLOR = '#ef4444';
const MUTED_NODE = '#d1d5db';
const MUTED_BORDER = '#9ca3af';
const MIN_GRAPH_HEIGHT = 760;
const LAYOUT_TOP_PADDING = 96;
const LAYOUT_LEFT_PADDING = 140;
const LAYOUT_ROW_GAP = 56;
const LAYOUT_COLUMN_GAP = 380;
const NODE_LABEL_WIDTH = 180;

const getBaseNodeColor = (node: SDK.ChunkGroupGraphNodeData) =>
  node.isInitial
    ? { background: ENTRY_COLOR, border: ENTRY_BORDER }
    : { background: ASYNC_COLOR, border: ASYNC_BORDER };

const getPathColor = (severity: SDK.ChunkGroupGraphPathSeverity) => {
  if (severity === 'danger') {
    return DANGER_COLOR;
  }
  if (severity === 'warning') {
    return WARNING_COLOR;
  }
  return HIGHLIGHT_COLOR;
};

const getSeverityTagColor = (
  severity: SDK.ChunkGroupGraphPathSeverity,
) => {
  if (severity === 'danger') {
    return 'red';
  }
  if (severity === 'warning') {
    return 'gold';
  }
  return 'default';
};

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

const buildForwardAdjacency = (
  edges: SDK.ChunkGroupGraphEdgeData[],
) => {
  const map = new Map<string, string[]>();
  for (const edge of edges) {
    if (!map.has(edge.from)) {
      map.set(edge.from, []);
    }
    map.get(edge.from)!.push(edge.to);
  }
  return map;
};

const buildReverseAdjacency = (
  edges: SDK.ChunkGroupGraphEdgeData[],
) => {
  const map = new Map<string, string[]>();
  for (const edge of edges) {
    if (!map.has(edge.to)) {
      map.set(edge.to, []);
    }
    map.get(edge.to)!.push(edge.from);
  }
  return map;
};

const buildEdgeMap = (edges: SDK.ChunkGroupGraphEdgeData[]) =>
  new Map(edges.map((edge) => [edge.id, edge]));

const buildNodeMap = (nodes: SDK.ChunkGroupGraphNodeData[]) =>
  new Map(nodes.map((node) => [node.id, node]));

const getNodeSymbolSize = (
  node: SDK.ChunkGroupGraphNodeData,
  maxEmittedSize: number,
) =>
  Math.max(
    38,
    Math.min(
      74,
      38 +
        36 *
          Math.sqrt(
            node.totalEmittedSize / maxEmittedSize,
          ),
    ),
  );

const getNodeLaneHeight = (
  node: SDK.ChunkGroupGraphNodeData,
  maxEmittedSize: number,
  outDegree: number,
) =>
  Math.max(
    124,
    getNodeSymbolSize(node, maxEmittedSize) + 74 + Math.min(24, outDegree * 6),
  );

const truncateLabel = (value: string, maxLength = 26) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;

const buildLayout = (
  nodes: SDK.ChunkGroupGraphNodeData[],
  edges: SDK.ChunkGroupGraphEdgeData[],
): GraphLayout => {
  if (!nodes.length) {
    return {
      height: MIN_GRAPH_HEIGHT,
      positions: new Map(),
    };
  }

  const indegree = new Map<string, number>(
    nodes.map((node) => [node.id, 0]),
  );
  for (const edge of edges) {
    indegree.set(edge.to, (indegree.get(edge.to) || 0) + 1);
  }

  const adjacency = buildForwardAdjacency(edges);
  const reverseAdjacency = buildReverseAdjacency(edges);
  const maxEmittedSize = Math.max(
    1,
    ...nodes.map((node) => node.totalEmittedSize),
  );
  const depth = new Map<string, number>();
  const queue = nodes
    .filter((node) => node.isInitial || !indegree.get(node.id))
    .sort((a, b) => {
      if (a.isInitial !== b.isInitial) {
        return a.isInitial ? -1 : 1;
      }
      if (a.totalEmittedSize !== b.totalEmittedSize) {
        return b.totalEmittedSize - a.totalEmittedSize;
      }
      return a.name.localeCompare(b.name);
    })
    .map((node) => node.id);
  const remainingIndegree = new Map(indegree);
  const processedNodes = new Set<string>();

  if (!queue.length && nodes[0]) {
    queue.push(nodes[0].id);
  }

  queue.forEach((nodeId) => depth.set(nodeId, 0));

  while (queue.length) {
    const current = queue.shift()!;
    if (processedNodes.has(current)) {
      continue;
    }
    processedNodes.add(current);
    const currentDepth = depth.get(current) || 0;
    for (const next of adjacency.get(current) ?? []) {
      const nextDepth = currentDepth + 1;
      if ((depth.get(next) ?? -1) < nextDepth) {
        depth.set(next, nextDepth);
      }
      const nextIndegree = (remainingIndegree.get(next) || 0) - 1;
      remainingIndegree.set(next, nextIndegree);
      if (nextIndegree <= 0) {
        queue.push(next);
      }
    }
  }

  nodes.forEach((node) => {
    if (!depth.has(node.id)) {
      depth.set(node.id, 0);
    }
  });

  const nodesByDepth = new Map<number, SDK.ChunkGroupGraphNodeData[]>();
  for (const node of nodes) {
    const level = depth.get(node.id) || 0;
    if (!nodesByDepth.has(level)) {
      nodesByDepth.set(level, []);
    }
    nodesByDepth.get(level)!.push(node);
  }

  const orderMap = new Map<string, number>();
  const levelLayouts = new Map<
    number,
    Array<{
      laneHeight: number;
      node: SDK.ChunkGroupGraphNodeData;
    }>
  >();
  let maxLevelHeight = 0;

  for (const [level, levelNodes] of [...nodesByDepth.entries()].sort(
    (a, b) => a[0] - b[0],
  )) {
    const sortedNodes = [...levelNodes].sort((a, b) => {
      const aParents = (reverseAdjacency.get(a.id) ?? [])
        .map((nodeId) => orderMap.get(nodeId))
        .filter((value): value is number => typeof value === 'number');
      const bParents = (reverseAdjacency.get(b.id) ?? [])
        .map((nodeId) => orderMap.get(nodeId))
        .filter((value): value is number => typeof value === 'number');

      const aParentOrder = aParents.length
        ? aParents.reduce((sum, value) => sum + value, 0) / aParents.length
        : Number.POSITIVE_INFINITY;
      const bParentOrder = bParents.length
        ? bParents.reduce((sum, value) => sum + value, 0) / bParents.length
        : Number.POSITIVE_INFINITY;

      if (aParentOrder !== bParentOrder) {
        return aParentOrder - bParentOrder;
      }
      if (a.isInitial !== b.isInitial) {
        return a.isInitial ? -1 : 1;
      }
      if (a.totalEmittedSize !== b.totalEmittedSize) {
        return b.totalEmittedSize - a.totalEmittedSize;
      }
      return a.name.localeCompare(b.name);
    });

    const levelLayout = sortedNodes.map((node) => ({
      laneHeight: getNodeLaneHeight(
        node,
        maxEmittedSize,
        (adjacency.get(node.id) ?? []).length,
      ),
      node,
    }));
    const levelHeight =
      levelLayout.reduce((sum, item) => sum + item.laneHeight, 0) +
      Math.max(0, levelLayout.length - 1) * LAYOUT_ROW_GAP;

    levelLayout.forEach((item, index) => {
      orderMap.set(item.node.id, index);
    });
    levelLayouts.set(level, levelLayout);
    maxLevelHeight = Math.max(maxLevelHeight, levelHeight);
  }

  const contentHeight = Math.max(
    MIN_GRAPH_HEIGHT - LAYOUT_TOP_PADDING * 2,
    maxLevelHeight,
  );
  const positions = new Map<
    string,
    {
      x: number;
      y: number;
    }
  >();

  for (const [level, levelNodes] of [...levelLayouts.entries()].sort(
    (a, b) => a[0] - b[0],
  )) {
    const levelHeight =
      levelNodes.reduce((sum, item) => sum + item.laneHeight, 0) +
      Math.max(0, levelNodes.length - 1) * LAYOUT_ROW_GAP;
    let currentY =
      LAYOUT_TOP_PADDING + (contentHeight - levelHeight) / 2;

    levelNodes.forEach((item) => {
      positions.set(item.node.id, {
        x: LAYOUT_LEFT_PADDING + level * LAYOUT_COLUMN_GAP,
        y: currentY + item.laneHeight / 2,
      });
      currentY += item.laneHeight + LAYOUT_ROW_GAP;
    });
  }

  return {
    height: contentHeight + LAYOUT_TOP_PADDING * 2,
    positions,
  };
};

const DetailPlaceholder = () => (
  <Empty
    description={
      <Typography.Text type="secondary">
        Click a chunk group or edge to inspect its details.
      </Typography.Text>
    }
  />
);

const ImportCard: React.FC<{
  fromName?: string;
  item: SDK.ChunkGroupGraphImportData;
}> = ({ fromName, item }) => (
  <div
    style={{
      border: '1px solid #f0f0f0',
      borderRadius: 8,
      padding: 12,
      background: '#fafafa',
    }}
  >
    {fromName ? (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        from {fromName}
      </Typography.Text>
    ) : null}
    {item.request ? (
      <div style={{ marginTop: fromName ? 6 : 0 }}>
        <Tag color="gold">import({JSON.stringify(item.request)})</Tag>
      </div>
    ) : null}
    {item.sourceModule ? (
      <div style={{ marginTop: 6 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Source module
        </Typography.Text>
        <div>
          <Typography.Text code style={{ fontSize: 12 }}>
            {item.sourceModule}
          </Typography.Text>
        </div>
      </div>
    ) : null}
    {item.loc ? (
      <div>
        <Typography.Text code style={{ fontSize: 12 }}>
          {item.loc}
        </Typography.Text>
      </div>
    ) : null}
    {item.snippet ? (
      <pre
        style={{
          marginTop: 8,
          marginBottom: 0,
          padding: 10,
          borderRadius: 6,
          background: '#111827',
          color: '#f9fafb',
          fontSize: 12,
          overflowX: 'auto',
        }}
      >
        {item.snippet}
      </pre>
    ) : null}
  </div>
);

const ChunkGroupGraphPanelBase: React.FC<ChunkGroupGraphPanelProps> = ({
  report,
}) => {
  const chartRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [hoveredPathId, setHoveredPathId] = useState<string | null>(null);
  const [expandedPathIds, setExpandedPathIds] = useState<Set<string>>(
    () => new Set(),
  );

  const nodes = report?.nodes ?? [];
  const edges = report?.edges ?? [];

  const nodeMap = useMemo(() => buildNodeMap(nodes), [nodes]);
  const edgeMap = useMemo(() => buildEdgeMap(edges), [edges]);
  const layout = useMemo(() => buildLayout(nodes, edges), [nodes, edges]);
  const graphHeight = Math.max(MIN_GRAPH_HEIGHT, layout.height);

  const matchedNodeIds = useMemo(() => {
    if (!searchQuery.trim()) {
      return new Set(nodes.map((node) => node.id));
    }

    const query = searchQuery.trim().toLowerCase();
    return new Set(
      nodes
        .filter((node) => node.searchText.toLowerCase().includes(query))
        .map((node) => node.id),
    );
  }, [nodes, searchQuery]);

  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) : undefined;
  const selectedEdge = selectedEdgeId ? edgeMap.get(selectedEdgeId) : undefined;
  const selectedNodePaths = selectedNode?.paths ?? [];
  const priorityNodes = useMemo(
    () =>
      (report?.priorityNodeIds ?? [])
        .map((nodeId) => nodeMap.get(nodeId))
        .filter(
          (node): node is SDK.ChunkGroupGraphNodeData => Boolean(node),
        )
        .filter((node) => matchedNodeIds.has(node.id)),
    [matchedNodeIds, nodeMap, report?.priorityNodeIds],
  );

  useEffect(() => {
    setExpandedPathIds(new Set());
  }, [selectedNode?.id]);

  useEffect(() => {
    const resizeChart = () => {
      chartRef.current?.getEchartsInstance?.().resize?.();
    };

    const rafId = window.requestAnimationFrame(resizeChart);
    const timer = window.setTimeout(resizeChart, 120);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timer);
    };
  }, [graphHeight, nodes.length, edges.length]);

  const hoveredPath = selectedNodePaths.find((path) => path.id === hoveredPathId);

  const highlightNodeIds = useMemo(() => {
    if (hoveredPath) {
      return new Set(hoveredPath.nodeIds);
    }

    if (selectedNode) {
      return new Set(selectedNodePaths.flatMap((path) => path.nodeIds));
    }

    if (selectedEdge) {
      return new Set([selectedEdge.from, selectedEdge.to]);
    }

    return new Set<string>();
  }, [hoveredPath, selectedEdge, selectedNode, selectedNodePaths]);

  const highlightEdgeIds = useMemo(() => {
    if (hoveredPath) {
      return new Set(hoveredPath.edgeIds);
    }

    if (selectedNode) {
      return new Set(selectedNodePaths.flatMap((path) => path.edgeIds));
    }

    if (selectedEdge) {
      return new Set([selectedEdge.id]);
    }

    return new Set<string>();
  }, [hoveredPath, selectedEdge, selectedNode, selectedNodePaths]);

  const option = useMemo<ChunkGroupGraphOption>(() => {
    const hasSelection =
      Boolean(selectedNode) || Boolean(selectedEdge) || Boolean(hoveredPath);
    const hoverColor = hoveredPath ? getPathColor(hoveredPath.severity) : HIGHLIGHT_COLOR;
    const useForceLayout = nodes.length > 12;
    const maxEmittedSize = Math.max(
      1,
      ...nodes.map((item) => item.totalEmittedSize),
    );

    const graphNodes = nodes.map((node) => {
      const position = layout.positions.get(node.id) ?? { x: 0, y: 0 };
      const baseColor = getBaseNodeColor(node);
      const isMatched = matchedNodeIds.has(node.id);
      const isOnHighlight = highlightNodeIds.has(node.id);
      const symbolSize = getNodeSymbolSize(node, maxEmittedSize);

      let opacity = 1;
      if (hasSelection) {
        opacity = isOnHighlight ? 1 : 0.16;
      } else if (searchQuery.trim()) {
        opacity = isMatched ? 1 : 0.16;
      }

      const removableRatio =
        node.groupTotalJSSize > 0
          ? node.removableJSSize / node.groupTotalJSSize
          : 0;
      const borderColor =
        selectedNode?.id === node.id
          ? '#111827'
          : removableRatio > 1 / 3
            ? DANGER_COLOR
            : removableRatio > 0
              ? WARNING_COLOR
              : baseColor.border;

      return {
        id: node.id,
        name: node.name,
        x: position.x,
        y: position.y,
        value: node.totalEmittedSize,
        symbolSize,
        itemStyle: {
          color: hasSelection && !isOnHighlight ? MUTED_NODE : baseColor.background,
          borderColor:
            hasSelection && !isOnHighlight ? MUTED_BORDER : borderColor,
          borderWidth: selectedNode?.id === node.id ? 4 : 2,
          opacity,
          shadowBlur: selectedNode?.id === node.id ? 12 : 0,
          shadowColor: 'rgba(17,24,39,0.25)',
        },
        label: {
          show: opacity > 0.3,
          position: 'bottom' as const,
          distance: 10,
          width: NODE_LABEL_WIDTH,
          overflow: 'truncate' as const,
          lineHeight: 16,
          align: 'center' as const,
          color: '#111827',
          fontSize: 12,
          fontWeight: selectedNode?.id === node.id ? 700 : 500,
          formatter: `${truncateLabel(node.name)}\n${formatSize(node.totalEmittedSize)}`,
        },
      };
    });

    const graphEdges = edges.map((edge) => {
      const highlight = highlightEdgeIds.has(edge.id);
      const matchesSearch =
        matchedNodeIds.has(edge.from) || matchedNodeIds.has(edge.to);
      let opacity = 0.6;
      if (hasSelection) {
        opacity = highlight ? 0.95 : 0.08;
      } else if (searchQuery.trim()) {
        opacity = matchesSearch ? 0.65 : 0.06;
      }

      return {
        id: edge.id,
        source: edge.from,
        target: edge.to,
        value: edge.imports.length,
        lineStyle: {
          color: highlight ? hoverColor : '#94a3b8',
          width: highlight ? 3 : 1.5,
          opacity,
          curveness: 0.12,
        },
        label: {
          show: edge.imports.length > 1 && opacity > 0.3,
          formatter: `${edge.imports.length} imports`,
          color: highlight ? hoverColor : '#64748b',
          fontSize: 10,
        },
      };
    });

    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#111827',
        borderWidth: 0,
        textStyle: {
          color: '#f9fafb',
        },
        formatter: (params: any) => {
          if (params.dataType === 'edge') {
            const edge = edgeMap.get(params.data.id);
            if (!edge) {
              return '';
            }
            const fromName = nodeMap.get(edge.from)?.name ?? edge.from;
            const toName = nodeMap.get(edge.to)?.name ?? edge.to;
            return `${fromName} → ${toName}<br/>${edge.imports.length} import() call(s)`;
          }

          const node = nodeMap.get(params.data.id);
          if (!node) {
            return '';
          }
          return [
            `<strong>${node.name}</strong>`,
            `${node.isInitial ? 'Entry' : 'Async'} chunk group`,
            `Emitted JS: ${formatSize(node.totalEmittedSize)}`,
            `Incremental removable: ${formatSize(node.removableJSSize)}`,
            `Group-local removable: ${formatSize(node.localRemovableJSSize)}`,
          ].join('<br/>');
        },
      },
      animationDuration: 250,
      animationDurationUpdate: 300,
      series: [
        {
          type: 'graph',
          layout: useForceLayout ? 'force' : 'none',
          roam: true,
          draggable: true,
          data: graphNodes,
          links: graphEdges,
          force: useForceLayout
            ? {
                initLayout: 'circular',
                repulsion: Math.min(3200, Math.max(1200, nodes.length * 110)),
                edgeLength: [180, 320],
                gravity: 0.06,
                friction: 0.5,
                layoutAnimation: false,
              }
            : undefined,
          lineStyle: {
            opacity: 0.65,
            width: 1.5,
          },
          emphasis: {
            focus: 'adjacency',
          },
        },
      ],
    };
  }, [
    edgeMap,
    edges,
    highlightEdgeIds,
    highlightNodeIds,
    hoveredPath,
    layout,
    matchedNodeIds,
    nodeMap,
    nodes,
    searchQuery,
    selectedEdge,
    selectedNode,
  ]);

  if (!nodes.length) {
    return (
      <Empty
        description={
          <Typography.Text type="secondary">
            Chunk group analysis is unavailable for this report.
          </Typography.Text>
        }
      />
    );
  }

  const overview = report?.overview;
  const removableGroupCount = overview?.removableGroupCount ?? 0;
  const totalRemovableSize = overview?.totalRemovableSize ?? 0;
  const dangerPathCount = overview?.dangerPathCount ?? 0;
  const warningPathCount = overview?.warningPathCount ?? 0;
  const selectedNodeImports = selectedNode?.incomingImports ?? [];

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Alert
        type={removableGroupCount ? 'warning' : 'success'}
        showIcon
        message={`Chunk groups: ${nodes.length}`}
        description={
          removableGroupCount
            ? `${removableGroupCount} groups add potentially removable JS-like modules on entry load paths (${formatSize(totalRemovableSize)} total incremental). ${dangerPathCount} path(s) are marked red and ${warningPathCount} path(s) are marked yellow.`
            : 'No additional potentially removable JS-like modules were detected on current entry load paths.'
        }
      />

      <Card
        title="Chunk Group Graph"
        extra={
          <Space>
            <Tag color="blue">Entry</Tag>
            <Tag color="green">Async</Tag>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Input
            allowClear
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search chunk groups..."
            prefix={<SearchOutlined />}
          />

          <Row gutter={16} align="top">
            <Col span={16}>
              <Card bodyStyle={{ padding: 0 }}>
                <ReactEChartsCore
                  ref={chartRef}
                  echarts={echarts}
                  option={option}
                  notMerge
                  style={{ height: graphHeight, width: '100%' }}
                  onEvents={{
                    click: (params: any) => {
                      if (params.dataType === 'node') {
                        setSelectedNodeId(params.data.id);
                        setSelectedEdgeId(null);
                        setHoveredPathId(null);
                      } else if (params.dataType === 'edge') {
                        setSelectedEdgeId(params.data.id);
                        setSelectedNodeId(null);
                        setHoveredPathId(null);
                      }
                    },
                  }}
                />
              </Card>
            </Col>

            <Col span={8}>
              <Card
                title="Details"
                extra={
                  selectedNode || selectedEdge ? (
                    <Typography.Link
                      onClick={() => {
                        setSelectedEdgeId(null);
                        setSelectedNodeId(null);
                        setHoveredPathId(null);
                      }}
                    >
                      Reset focus
                    </Typography.Link>
                  ) : null
                }
                bodyStyle={{
                  maxHeight: 760,
                  overflowY: 'auto',
                }}
              >
                {!selectedNode && !selectedEdge ? <DetailPlaceholder /> : null}

                {selectedNode ? (
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                      <Typography.Title level={5} style={{ marginBottom: 8 }}>
                        {selectedNode.name}
                      </Typography.Title>
                      <Space wrap>
                        <Tag color={selectedNode.isInitial ? 'blue' : 'green'}>
                          {selectedNode.isInitial ? 'Entry' : 'Async'}
                        </Tag>
                        <Tag>{formatSize(selectedNode.totalEmittedSize)} emitted</Tag>
                        <Tag>{formatSize(selectedNode.groupTotalJSSize)} JS total</Tag>
                        <Tag color={selectedNode.removableJSSize ? 'gold' : 'default'}>
                          {formatSize(selectedNode.removableJSSize)} removable on path
                        </Tag>
                        <Tag color={selectedNode.localRemovableJSSize ? 'default' : 'default'}>
                          {formatSize(selectedNode.localRemovableJSSize)} in group
                        </Tag>
                        {selectedNode.inheritedRemovableJSSize > 0 ? (
                          <Tag color="cyan">
                            {formatSize(selectedNode.inheritedRemovableJSSize)} already loaded before
                          </Tag>
                        ) : null}
                      </Space>
                      <div style={{ marginTop: 8 }}>
                        <Typography.Text type="secondary">
                          Reachable modules: {selectedNode.reachableModuleCount} /{' '}
                          {selectedNode.actualModuleCount}
                        </Typography.Text>
                      </div>
                    </div>

                    <div>
                      <Typography.Title level={5}>Chunks In This Group</Typography.Title>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {selectedNode.chunks.length ? (
                          selectedNode.chunks.map((chunk) => (
                            <div
                              key={chunk.id}
                              style={{
                                border: '1px solid #f0f0f0',
                                borderRadius: 8,
                                padding: 12,
                              }}
                            >
                              <Typography.Text strong>{chunk.name}</Typography.Text>
                              <div style={{ marginTop: 6 }}>
                                <Space wrap>
                                  <Tag>{formatSize(chunk.emittedSize)} emitted</Tag>
                                  <Tag>{formatSize(chunk.totalJSSize)} JS total</Tag>
                                  <Tag>{chunk.moduleCount} modules</Tag>
                                </Space>
                              </div>
                              {chunk.files.length ? (
                                <div style={{ marginTop: 8 }}>
                                  {chunk.files.map((file) => (
                                    <div key={file}>
                                      <Typography.Text code>{file}</Typography.Text>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ))
                        ) : (
                          <Typography.Text type="secondary">
                            No JS chunks recorded for this group.
                          </Typography.Text>
                        )}
                      </Space>
                    </div>

                    <div>
                      <Typography.Title level={5}>
                        Dynamic Import Origins ({selectedNodeImports.length})
                      </Typography.Title>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {selectedNodeImports.length ? (
                          selectedNodeImports.map((item, index) => (
                            <ImportCard
                              key={`${item.edgeId}_${index}`}
                              fromName={item.fromName}
                              item={item}
                            />
                          ))
                        ) : (
                          <Typography.Text type="secondary">
                            No inbound async import() origins were captured for this group.
                          </Typography.Text>
                        )}
                      </Space>
                    </div>

                    <div>
                      <Typography.Title level={5}>
                        Incremental Removable JS Modules ({selectedNode.removableJSModuleCount})
                      </Typography.Title>
                      {selectedNode.inheritedRemovableJSModuleCount > 0 ? (
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {formatSize(selectedNode.inheritedRemovableJSSize)} of this group's local removable
                          JS has already been loaded on every entry path before reaching this group.
                        </Typography.Text>
                      ) : null}
                      {selectedNode.removableJSModules.length > 50 ? (
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          Showing top 50 modules by size.
                        </Typography.Text>
                      ) : null}
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {selectedNode.removableJSModules.length ? (
                          selectedNode.removableJSModules.slice(0, 50).map((module) => (
                            <div
                              key={module.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: 12,
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <Typography.Text style={{ display: 'block' }}>
                                  {module.resource ?? module.name}
                                </Typography.Text>
                              </div>
                              <Typography.Text code>
                                {formatSize(module.size)}
                              </Typography.Text>
                            </div>
                          ))
                        ) : (
                          <Typography.Text type="secondary">
                            {selectedNode.localRemovableJSModuleCount > 0
                              ? 'No additional removable JS-like modules are introduced here; the group-local removable modules were already loaded earlier on every entry path.'
                              : 'No removable JS-like modules were detected in this group.'}
                          </Typography.Text>
                        )}
                      </Space>
                    </div>

                    {selectedNode.inheritedRemovableJSModules.length ? (
                      <div>
                        <Typography.Title level={5}>
                          Already Loaded Before This Group ({selectedNode.inheritedRemovableJSModuleCount})
                        </Typography.Title>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          {selectedNode.inheritedRemovableJSModules
                            .slice(0, 50)
                            .map((module) => (
                              <div
                                key={module.id}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  gap: 12,
                                }}
                              >
                                <div style={{ minWidth: 0 }}>
                                  <Typography.Text style={{ display: 'block' }}>
                                    {module.resource ?? module.name}
                                  </Typography.Text>
                                </div>
                                <Typography.Text code>
                                  {formatSize(module.size)}
                                </Typography.Text>
                              </div>
                            ))}
                        </Space>
                      </div>
                    ) : null}

                    <div>
                      <Typography.Title level={5}>
                        Load Paths From Entry ({selectedNode.pathCount})
                      </Typography.Title>
                      {selectedNode.pathsTruncated ? (
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          Showing the first {report?.pathLimit ?? selectedNode.pathCount} paths for this
                          group. The full path set is larger.
                        </Typography.Text>
                      ) : null}
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {selectedNodePaths.length ? (
                          selectedNodePaths.map((path) => {
                            const color = getPathColor(path.severity);
                            const backgroundColor =
                              path.severity === 'danger'
                                ? '#fff1f0'
                                : path.severity === 'warning'
                                  ? '#fffbe6'
                                  : '#fafafa';
                            const isExpanded = expandedPathIds.has(path.id);

                            const header = (
                              <div
                                onMouseEnter={() => setHoveredPathId(path.id)}
                                onMouseLeave={() => setHoveredPathId(null)}
                                onClick={() => {
                                  setExpandedPathIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(path.id)) {
                                      next.delete(path.id);
                                    } else {
                                      next.add(path.id);
                                    }
                                    return next;
                                  });
                                }}
                                style={{
                                  border: `1px solid ${color}`,
                                  borderRadius: 8,
                                  padding: 12,
                                  background: backgroundColor,
                                  cursor: 'pointer',
                                }}
                              >
                                <Space
                                  direction="vertical"
                                  style={{ width: '100%' }}
                                  size="small"
                                >
                                  <div
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      gap: 12,
                                      alignItems: 'flex-start',
                                    }}
                                  >
                                    <Typography.Text strong style={{ flex: 1 }}>
                                      {path.label}
                                    </Typography.Text>
                                    <Typography.Text
                                      type="secondary"
                                      style={{ fontSize: 12, whiteSpace: 'nowrap' }}
                                    >
                                      {isExpanded ? 'Collapse' : 'Expand'}
                                    </Typography.Text>
                                  </div>
                                  <Space wrap>
                                    <Tag color="default">
                                      {formatSize(path.totalEmittedSize)} loaded
                                    </Tag>
                                    <Tag color="default">
                                      {path.chunkIds.length} unique chunks
                                    </Tag>
                                    <Tag color="default">
                                      {formatSize(path.totalJSSize)} JS total
                                    </Tag>
                                    {path.unnecessarySize > 0 ? (
                                      <Tag color={path.severity === 'danger' ? 'red' : 'gold'}>
                                        {formatSize(path.unnecessarySize)} unnecessary
                                      </Tag>
                                    ) : null}
                                    {path.unnecessarySize > 0 ? (
                                      <Tag color={path.severity === 'danger' ? 'red' : 'gold'}>
                                        {formatPercent(path.ratio)}
                                      </Tag>
                                    ) : null}
                                    {path.unnecessaryModuleCount > path.topUnnecessaryModules.length ? (
                                      <Tag color="default">
                                        top {path.topUnnecessaryModules.length} /{' '}
                                        {path.unnecessaryModuleCount} modules
                                      </Tag>
                                    ) : null}
                                  </Space>
                                  {isExpanded ? (
                                    <>
                                      <div>
                                        <Typography.Text
                                          type="secondary"
                                          style={{ fontSize: 12 }}
                                        >
                                          Chunks
                                        </Typography.Text>
                                        {path.chunks.map((chunk) => (
                                          <div
                                            key={chunk.id}
                                            style={{
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              gap: 12,
                                            }}
                                          >
                                            <Typography.Text style={{ fontSize: 12 }}>
                                              {chunk.name}
                                            </Typography.Text>
                                            <Typography.Text code style={{ fontSize: 12 }}>
                                              {formatSize(chunk.emittedSize)}
                                            </Typography.Text>
                                          </div>
                                        ))}
                                      </div>
                                      {path.topUnnecessaryModules.length ? (
                                        <div>
                                          <Typography.Text
                                            type="secondary"
                                            style={{ fontSize: 12 }}
                                          >
                                            Top unnecessary modules
                                          </Typography.Text>
                                          {path.topUnnecessaryModules
                                            .slice(0, 5)
                                            .map((module) => (
                                            <div
                                              key={module.id}
                                              style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                gap: 12,
                                              }}
                                            >
                                              <Typography.Text style={{ fontSize: 12 }}>
                                                {module.resource ?? module.name}
                                              </Typography.Text>
                                              <Typography.Text code style={{ fontSize: 12 }}>
                                                {formatSize(module.size)}
                                              </Typography.Text>
                                            </div>
                                          ))}
                                        </div>
                                      ) : null}
                                    </>
                                  ) : null}
                                </Space>
                              </div>
                            );

                            if (path.severity !== 'danger') {
                              return <React.Fragment key={path.id}>{header}</React.Fragment>;
                            }

                            return (
                              <Tooltip title="非必要依赖过多" key={path.id}>
                                {header}
                              </Tooltip>
                            );
                          })
                        ) : (
                          <Typography.Text type="secondary">
                            No load path from entry was found for the selected chunk group.
                          </Typography.Text>
                        )}
                      </Space>
                    </div>
                  </Space>
                ) : null}

                {selectedEdge ? (
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                      <Typography.Title level={5} style={{ marginBottom: 8 }}>
                        {selectedEdge.fromName + ' → ' + selectedEdge.toName}
                      </Typography.Title>
                      <Tag>{selectedEdge.imports.length} import() call(s)</Tag>
                    </div>

                    <Space direction="vertical" style={{ width: '100%' }}>
                      {selectedEdge.imports.map((item, index) => (
                        <ImportCard key={`${selectedEdge.id}_${index}`} item={item} />
                      ))}
                    </Space>
                  </Space>
                ) : null}
              </Card>
            </Col>
          </Row>

          <Card
            title={`Chunk Group List (${priorityNodes.length})`}
            extra={
              <Typography.Text type="secondary">
                Sorted by unnecessary size on load paths
              </Typography.Text>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {priorityNodes.length ? (
                priorityNodes.map((node) => {
                  const isSelected = selectedNode?.id === node.id;
                  const topPath = node.paths[0];
                  const severity = node.worstPathSeverity;
                  const borderColor =
                    severity === 'danger'
                      ? DANGER_COLOR
                      : severity === 'warning'
                        ? WARNING_COLOR
                        : '#d9d9d9';
                  const backgroundColor =
                    severity === 'danger'
                      ? '#fff1f0'
                      : severity === 'warning'
                        ? '#fffbe6'
                        : '#ffffff';

                  return (
                    <div
                      key={node.id}
                      onClick={() => {
                        setSelectedNodeId(node.id);
                        setSelectedEdgeId(null);
                        setHoveredPathId(null);
                      }}
                      style={{
                        border: `1px solid ${isSelected ? '#111827' : borderColor}`,
                        borderRadius: 10,
                        padding: 14,
                        background: backgroundColor,
                        cursor: 'pointer',
                        boxShadow: isSelected
                          ? '0 0 0 2px rgba(17,24,39,0.08)'
                          : 'none',
                      }}
                    >
                      <Space
                        direction="vertical"
                        style={{ width: '100%' }}
                        size="small"
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 12,
                            alignItems: 'flex-start',
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <Typography.Text strong style={{ display: 'block' }}>
                              {node.name}
                            </Typography.Text>
                            {topPath ? (
                              <Typography.Text
                                type="secondary"
                                style={{ fontSize: 12 }}
                              >
                                {topPath.label}
                              </Typography.Text>
                            ) : null}
                          </div>
                          <Space wrap size={[4, 4]}>
                            <Tag color={node.isInitial ? 'blue' : 'green'}>
                              {node.isInitial ? 'Entry' : 'Async'}
                            </Tag>
                            <Tag color={getSeverityTagColor(severity)}>
                              {severity === 'danger'
                                ? 'Red path'
                                : severity === 'warning'
                                  ? 'Yellow path'
                                  : 'No path risk'}
                            </Tag>
                          </Space>
                        </div>

                        <Space wrap>
                          <Tag>{formatSize(node.totalEmittedSize)} emitted</Tag>
                          <Tag>{formatSize(node.groupTotalJSSize)} JS total</Tag>
                          <Tag color={node.removableJSSize ? 'gold' : 'default'}>
                            {formatSize(node.removableJSSize)} incremental removable
                          </Tag>
                          <Tag color={getSeverityTagColor(severity)}>
                            {formatSize(node.maxPathUnnecessarySize)} worst path unnecessary
                          </Tag>
                          <Tag>{node.pathCount} path(s)</Tag>
                          <Tag>{node.incomingImports.length} import(s)</Tag>
                        </Space>

                        {topPath ? (
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: 12,
                              flexWrap: 'wrap',
                            }}
                          >
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                              Worst path ratio {formatPercent(topPath.ratio)}
                            </Typography.Text>
                            {topPath.topUnnecessaryModules[0] ? (
                              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                Top module:{' '}
                                {topPath.topUnnecessaryModules[0].resource ??
                                  topPath.topUnnecessaryModules[0].name}{' '}
                                ({formatSize(topPath.topUnnecessaryModules[0].size)})
                              </Typography.Text>
                            ) : null}
                          </div>
                        ) : null}
                      </Space>
                    </div>
                  );
                })
              ) : (
                <Empty
                  description={
                    <Typography.Text type="secondary">
                      No chunk groups match the current search.
                    </Typography.Text>
                  }
                />
              )}
            </Space>
          </Card>
        </Space>
      </Card>
    </Space>
  );
};

export const ChunkGroupGraphPanel = memo(ChunkGroupGraphPanelBase);
