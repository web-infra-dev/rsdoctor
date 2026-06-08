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
  Button,
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
import {
  getPathParentImportSnippetLabels,
  normalizeGraphLabel,
} from './chunk-group-helpers';

echarts.use([GraphChart, TooltipComponent, CanvasRenderer]);

type ChunkGroupGraphOption = ComposeOption<
  GraphSeriesOption | TooltipComponentOption
>;

type GraphPosition = {
  x: number;
  y: number;
};

type GraphLayout = {
  height: number;
  positions: Map<string, GraphPosition>;
};

type ChunkGroupGraphPanelProps = {
  report?: SDK.ChunkGroupGraphData;
};

const ENTRY_COLOR = '#1f6feb';
const ASYNC_COLOR = '#238636';
const HIGHLIGHT_COLOR = '#f59e0b';
const WARNING_COLOR = '#f59e0b';
const DANGER_COLOR = '#ef4444';
const MUTED_NODE = '#d1d5db';
const MUTED_BORDER = '#9ca3af';
const NODE_BORDER = '#94a3b8';
const NODE_SELECTED_BORDER = '#334155';
const EDGE_COLOR = '#94a3b8';
const EDGE_HIGHLIGHT_COLOR = '#64748b';
const MIN_GRAPH_HEIGHT = 520;
const MAX_GRAPH_HEIGHT = 620;
const LAYOUT_TOP_PADDING = 64;
const LAYOUT_LEFT_PADDING = 120;
const LAYOUT_COLUMN_GAP = 640;
const LAYOUT_SUBCOLUMN_GAP = 360;
const LAYOUT_PACKED_ROW_GAP = 50;
const LAYOUT_PACKED_ROW_GAP_VARIANCE = 64;
const LAYOUT_COLUMN_TOP_VARIANCE = 140;
const LAYOUT_NODE_X_JITTER = 170;
const LAYOUT_NODE_Y_JITTER = 32;
const MAX_LAYOUT_ROWS_PER_LEVEL = 12;
const DRAG_ADAPT_PRIMARY_STRENGTH = 0.34;
const DRAG_ADAPT_SECONDARY_STRENGTH = 0.14;
const DRAG_ADAPT_MAX_FOLLOW_DISTANCE = 320;
const DRAG_REPEL_RADIUS = 230;
const DRAG_REPEL_STRENGTH = 0.42;
const DRAG_MAX_REPEL_DISTANCE = 96;
const LARGE_GRAPH_NODE_SCALE = 0.52;
const NODE_LABEL_WIDTH = 180;
const MIN_NODE_SYMBOL_SIZE = 30;
const MAX_NODE_SYMBOL_SIZE = 112;
const GRAPH_BOUNDARY_NODE_ID_PREFIX = '__chunk-group-graph-boundary__';
const GRAPH_MIN_ZOOM = 0.2;
const GRAPH_MAX_ZOOM = 4;
const GRAPH_ZOOM_STEP = 0.25;

const getBaseNodeColor = (node: SDK.ChunkGroupGraphNodeData) =>
  node.isInitial
    ? { background: ENTRY_COLOR, border: NODE_BORDER }
    : { background: ASYNC_COLOR, border: NODE_BORDER };

const getPathColor = (severity: SDK.ChunkGroupGraphPathSeverity) => {
  if (severity === 'danger') {
    return DANGER_COLOR;
  }
  if (severity === 'warning') {
    return WARNING_COLOR;
  }
  return HIGHLIGHT_COLOR;
};

const getSeverityTagColor = (severity: SDK.ChunkGroupGraphPathSeverity) => {
  if (severity === 'danger') {
    return 'red';
  }
  if (severity === 'warning') {
    return 'gold';
  }
  return 'default';
};

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

const clampGraphZoom = (zoom: number) =>
  Math.max(GRAPH_MIN_ZOOM, Math.min(GRAPH_MAX_ZOOM, zoom));

const buildForwardAdjacency = (edges: SDK.ChunkGroupGraphEdgeData[]) => {
  const map = new Map<string, string[]>();
  for (const edge of edges) {
    if (!map.has(edge.from)) {
      map.set(edge.from, []);
    }
    map.get(edge.from)!.push(edge.to);
  }
  return map;
};

const buildReverseAdjacency = (edges: SDK.ChunkGroupGraphEdgeData[]) => {
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
    MIN_NODE_SYMBOL_SIZE,
    Math.min(
      MAX_NODE_SYMBOL_SIZE,
      MIN_NODE_SYMBOL_SIZE +
        (MAX_NODE_SYMBOL_SIZE - MIN_NODE_SYMBOL_SIZE) *
          Math.sqrt(node.totalEmittedSize / maxEmittedSize),
    ),
  );

const getNodeLaneHeight = (
  node: SDK.ChunkGroupGraphNodeData,
  maxEmittedSize: number,
  outDegree: number,
) =>
  Math.max(
    96,
    getNodeSymbolSize(node, maxEmittedSize) + 50 + Math.min(18, outDegree * 4),
  );

const stableHash = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const stableRatio = (value: string) => (stableHash(value) % 10000) / 9999;

const stableSignedRatio = (value: string) => stableRatio(value) * 2 - 1;

const clampNumber = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const limitVector = (position: GraphPosition, maxDistance: number) => {
  const distance = Math.hypot(position.x, position.y);
  if (!distance || distance <= maxDistance) {
    return position;
  }

  const scale = maxDistance / distance;
  return {
    x: position.x * scale,
    y: position.y * scale,
  };
};

const getZRenderEventPoint = (event: any) => ({
  x:
    typeof event.offsetX === 'number'
      ? event.offsetX
      : typeof event.zrX === 'number'
        ? event.zrX
        : 0,
  y:
    typeof event.offsetY === 'number'
      ? event.offsetY
      : typeof event.zrY === 'number'
        ? event.zrY
        : 0,
});

const sortPathsByOpportunity = (
  a: SDK.ChunkGroupGraphPathData,
  b: SDK.ChunkGroupGraphPathData,
) =>
  b.unnecessarySize - a.unnecessarySize ||
  b.ratio - a.ratio ||
  b.totalEmittedSize - a.totalEmittedSize ||
  a.label.localeCompare(b.label);

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

  const indegree = new Map<string, number>(nodes.map((node) => [node.id, 0]));
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
    {
      height: number;
      items: Array<{
        column: number;
        laneHeight: number;
        node: SDK.ChunkGroupGraphNodeData;
        y: number;
      }>;
      width: number;
    }
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
    const columnCount = Math.max(
      1,
      Math.ceil(levelLayout.length / MAX_LAYOUT_ROWS_PER_LEVEL),
    );
    const columns = Array.from({ length: columnCount }, (_, columnIndex) => ({
      count: 0,
      height:
        columnCount > 1
          ? stableRatio(`${level}:${columnIndex}:top`) *
            LAYOUT_COLUMN_TOP_VARIANCE
          : 0,
    }));
    const placedItems: Array<{
      column: number;
      laneHeight: number;
      node: SDK.ChunkGroupGraphNodeData;
      y: number;
    }> = [];

    levelLayout.forEach((item, index) => {
      const preferredColumn =
        columnCount <= 1
          ? 0
          : Math.min(
              columnCount - 1,
              Math.max(
                0,
                Math.round(
                  ((index + stableSignedRatio(`${item.node.id}:column`) * 0.4) /
                    Math.max(1, levelLayout.length - 1)) *
                    (columnCount - 1),
                ),
              ),
            );
      const column = columns.reduce(
        (bestColumn, currentColumn, currentIndex) => {
          const currentScore =
            currentColumn.height +
            Math.abs(currentIndex - preferredColumn) * 130 +
            currentColumn.count * 12;
          const best = columns[bestColumn];
          const bestScore =
            best.height +
            Math.abs(bestColumn - preferredColumn) * 130 +
            best.count * 12;

          return currentScore < bestScore ? currentIndex : bestColumn;
        },
        0,
      );
      const yJitter =
        stableSignedRatio(`${item.node.id}:y`) * LAYOUT_NODE_Y_JITTER;
      const y = columns[column].height + item.laneHeight / 2 + yJitter;
      const gap =
        LAYOUT_PACKED_ROW_GAP +
        stableRatio(`${item.node.id}:gap`) * LAYOUT_PACKED_ROW_GAP_VARIANCE;

      placedItems.push({
        column,
        laneHeight: item.laneHeight,
        node: item.node,
        y,
      });
      columns[column].height += item.laneHeight + gap;
      columns[column].count += 1;
    });

    const levelHeight = Math.max(
      ...columns.map((column) => column.height),
      ...placedItems.map((item) => item.y + item.laneHeight / 2),
    );
    const levelWidth = Math.max(0, (columnCount - 1) * LAYOUT_SUBCOLUMN_GAP);

    levelLayout.forEach((item, index) => {
      orderMap.set(item.node.id, index);
    });
    levelLayouts.set(level, {
      height: levelHeight,
      items: placedItems,
      width: levelWidth,
    });
    maxLevelHeight = Math.max(maxLevelHeight, levelHeight);
  }

  const organicContentHeight =
    nodes.length > 60 ? 420 + Math.sqrt(nodes.length) * 72 : 0;
  const contentHeight = Math.max(
    MIN_GRAPH_HEIGHT - LAYOUT_TOP_PADDING * 2,
    maxLevelHeight,
    Math.min(1200, organicContentHeight),
  );
  const positions = new Map<
    string,
    {
      x: number;
      y: number;
    }
  >();

  let currentX = LAYOUT_LEFT_PADDING;
  for (const [level, levelLayout] of [...levelLayouts.entries()].sort(
    (a, b) => a[0] - b[0],
  )) {
    const currentY = LAYOUT_TOP_PADDING;
    const availableY = Math.max(0, contentHeight - levelLayout.height);
    const levelWaveRatio =
      Math.sin(level * 1.17) * 0.36 +
      stableSignedRatio(`${level}:level-y`) * 0.18;
    const levelOffsetY = clampNumber(
      availableY / 2 + levelWaveRatio * availableY,
      0,
      availableY,
    );

    levelLayout.items.forEach((item) => {
      const xJitter =
        stableSignedRatio(`${item.node.id}:x`) *
        (levelLayout.width > 0
          ? LAYOUT_NODE_X_JITTER
          : LAYOUT_NODE_X_JITTER / 2);
      const xWave =
        levelLayout.width > 0
          ? stableSignedRatio(`${item.column}:wave:${currentX}`) *
            LAYOUT_NODE_X_JITTER
          : 0;
      positions.set(item.node.id, {
        x: currentX + item.column * LAYOUT_SUBCOLUMN_GAP + xJitter + xWave,
        y: currentY + levelOffsetY + item.y,
      });
    });
    currentX += Math.max(
      LAYOUT_COLUMN_GAP,
      levelLayout.width + LAYOUT_COLUMN_GAP,
    );
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
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const graphZoomRef = useRef<number | null>(null);
  const graphZoomSyncRafRef = useRef<number | null>(null);
  const blankPointerRef = useRef<{
    x: number;
    y: number;
    dragged: boolean;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [graphWidth, setGraphWidth] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [hoveredPathId, setHoveredPathId] = useState<string | null>(null);
  const [graphZoom, setGraphZoom] = useState(1);
  const [draggedNodePositions, setDraggedNodePositions] = useState<
    Map<string, GraphPosition>
  >(() => new Map());
  const [expandedPathIds, setExpandedPathIds] = useState<Set<string>>(
    () => new Set(),
  );

  const nodes = report?.nodes ?? [];
  const edges = report?.edges ?? [];

  const nodeMap = useMemo(() => buildNodeMap(nodes), [nodes]);
  const edgeMap = useMemo(() => buildEdgeMap(edges), [edges]);
  const layout = useMemo(() => buildLayout(nodes, edges), [nodes, edges]);
  const graphHeight = Math.min(
    MAX_GRAPH_HEIGHT,
    Math.max(MIN_GRAPH_HEIGHT, layout.height),
  );
  const isLargeGraph = nodes.length > 80;
  const defaultGraphZoom = isLargeGraph ? 0.72 : 1;

  useEffect(() => {
    graphZoomRef.current = defaultGraphZoom;
    setGraphZoom(defaultGraphZoom);
    chartRef.current?.getEchartsInstance?.().setOption?.(
      {
        series: [
          {
            zoom: defaultGraphZoom,
          },
        ],
      },
      {
        lazyUpdate: false,
        notMerge: false,
        silent: true,
      },
    );
  }, [defaultGraphZoom]);

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
  const selectedNodePaths = useMemo(
    () => [...(selectedNode?.paths ?? [])].sort(sortPathsByOpportunity),
    [selectedNode?.paths],
  );
  const priorityNodes = useMemo(
    () =>
      (report?.priorityNodeIds ?? [])
        .map((nodeId) => nodeMap.get(nodeId))
        .filter((node): node is SDK.ChunkGroupGraphNodeData => Boolean(node))
        .filter((node) => matchedNodeIds.has(node.id)),
    [matchedNodeIds, nodeMap, report?.priorityNodeIds],
  );

  const syncGraphZoomState = (nextZoom: number) => {
    const zoom = clampGraphZoom(nextZoom);
    graphZoomRef.current = zoom;
    setGraphZoom((currentZoom) =>
      Math.abs(currentZoom - zoom) < 0.005 ? currentZoom : zoom,
    );
  };

  const getChartGraphZoom = (chart: any) => {
    const series = chart?.getOption?.()?.series?.[0];
    const zoom = Array.isArray(series?.zoom) ? series.zoom[0] : series?.zoom;
    return typeof zoom === 'number' ? zoom : graphZoomRef.current;
  };

  const syncGraphZoomFromChart = () => {
    if (graphZoomSyncRafRef.current !== null) {
      return;
    }

    graphZoomSyncRafRef.current = window.requestAnimationFrame(() => {
      graphZoomSyncRafRef.current = null;
      const chart = chartRef.current?.getEchartsInstance?.();
      const zoom = getChartGraphZoom(chart);
      if (typeof zoom === 'number') {
        syncGraphZoomState(zoom);
      }
    });
  };

  const storeDraggedNodePosition = (params: any) => {
    if (params?.dataType !== 'node') {
      return;
    }

    const nodeId = params?.data?.id;
    if (
      typeof nodeId !== 'string' ||
      nodeId.startsWith(GRAPH_BOUNDARY_NODE_ID_PREFIX)
    ) {
      return;
    }

    const chart = chartRef.current?.getEchartsInstance?.();
    const graphData = chart?.getModel?.()?.getSeriesByIndex?.(0)?.getData?.();
    const dataIndex =
      typeof params.dataIndex === 'number' ? params.dataIndex : undefined;
    const layoutPosition =
      typeof dataIndex === 'number'
        ? graphData?.getItemLayout?.(dataIndex)
        : undefined;

    if (
      !Array.isArray(layoutPosition) ||
      typeof layoutPosition[0] !== 'number' ||
      typeof layoutPosition[1] !== 'number' ||
      !Number.isFinite(layoutPosition[0]) ||
      !Number.isFinite(layoutPosition[1])
    ) {
      return;
    }

    const nextDraggedPosition = {
      x: layoutPosition[0],
      y: layoutPosition[1],
    };

    setDraggedNodePositions((currentPositions) => {
      const basePositions = new Map(layout.positions);
      currentPositions.forEach((position, currentNodeId) => {
        basePositions.set(currentNodeId, position);
      });

      const previousPosition = basePositions.get(nodeId);
      if (
        previousPosition &&
        Math.abs(previousPosition.x - nextDraggedPosition.x) < 0.5 &&
        Math.abs(previousPosition.y - nextDraggedPosition.y) < 0.5
      ) {
        return currentPositions;
      }

      const delta = previousPosition
        ? {
            x: nextDraggedPosition.x - previousPosition.x,
            y: nextDraggedPosition.y - previousPosition.y,
          }
        : { x: 0, y: 0 };
      const followDelta = limitVector(delta, DRAG_ADAPT_MAX_FOLLOW_DISTANCE);
      const adjacency = buildForwardAdjacency(edges);
      const reverseAdjacency = buildReverseAdjacency(edges);
      const firstHopNodeIds = new Set([
        ...(adjacency.get(nodeId) ?? []),
        ...(reverseAdjacency.get(nodeId) ?? []),
      ]);
      const adaptiveStrengthByNodeId = new Map<string, number>();

      firstHopNodeIds.forEach((connectedNodeId) => {
        adaptiveStrengthByNodeId.set(
          connectedNodeId,
          DRAG_ADAPT_PRIMARY_STRENGTH,
        );
        [
          ...(adjacency.get(connectedNodeId) ?? []),
          ...(reverseAdjacency.get(connectedNodeId) ?? []),
        ].forEach((secondaryNodeId) => {
          if (
            secondaryNodeId !== nodeId &&
            !firstHopNodeIds.has(secondaryNodeId)
          ) {
            adaptiveStrengthByNodeId.set(
              secondaryNodeId,
              Math.max(
                adaptiveStrengthByNodeId.get(secondaryNodeId) ?? 0,
                DRAG_ADAPT_SECONDARY_STRENGTH,
              ),
            );
          }
        });
      });

      const nextPositions = new Map(currentPositions);
      nextPositions.set(nodeId, nextDraggedPosition);

      adaptiveStrengthByNodeId.forEach((strength, adaptiveNodeId) => {
        const currentPosition =
          nextPositions.get(adaptiveNodeId) ??
          basePositions.get(adaptiveNodeId);
        if (!currentPosition) {
          return;
        }

        nextPositions.set(adaptiveNodeId, {
          x: currentPosition.x + followDelta.x * strength,
          y: currentPosition.y + followDelta.y * strength,
        });
      });

      nodes.forEach((node) => {
        if (node.id === nodeId) {
          return;
        }

        const currentPosition =
          nextPositions.get(node.id) ?? basePositions.get(node.id);
        if (!currentPosition) {
          return;
        }

        const vector = {
          x: currentPosition.x - nextDraggedPosition.x,
          y: currentPosition.y - nextDraggedPosition.y,
        };
        const distance = Math.hypot(vector.x, vector.y);
        if (distance >= DRAG_REPEL_RADIUS) {
          return;
        }

        const fallbackDirection = stableSignedRatio(`${node.id}:drag-repel`);
        const unitVector =
          distance > 0.1
            ? {
                x: vector.x / distance,
                y: vector.y / distance,
              }
            : {
                x: fallbackDirection,
                y: stableSignedRatio(`${node.id}:drag-repel-y`),
              };
        const connectedStrength = adaptiveStrengthByNodeId.get(node.id) ?? 0;
        const repelDistance = Math.min(
          DRAG_MAX_REPEL_DISTANCE,
          (DRAG_REPEL_RADIUS - distance) *
            DRAG_REPEL_STRENGTH *
            (1 - connectedStrength * 0.6),
        );

        nextPositions.set(node.id, {
          x: currentPosition.x + unitVector.x * repelDistance,
          y: currentPosition.y + unitVector.y * repelDistance,
        });
      });

      return nextPositions;
    });
  };

  const configureGraphRoamController = () => {
    const chart = chartRef.current?.getEchartsInstance?.();
    if (!chart) {
      return;
    }

    const graphView = (chart as any)._chartsViews?.find(
      (view: any) => view?.type === 'graph',
    );
    const controller = graphView?._controller;
    if (!controller?.setPointerChecker) {
      return;
    }

    controller.enable?.(true, {
      moveOnMouseMove: true,
      moveOnMouseWheel: false,
      preventDefaultMouseMove: true,
      zoomOnMouseWheel: 'ctrl',
    });

    // ECharts graph only roams inside the graph group's bounding rect by
    // default; the chunk graph needs the whole canvas to be draggable. Zoom
    // remains restricted to pinch or Ctrl+wheel so page scroll still works.
    controller.setPointerChecker((_event: any, x: number, y: number) => {
      const width = chart.getWidth?.() ?? graphWidth;
      const height = chart.getHeight?.() ?? graphHeight;
      return x >= 0 && x <= width && y >= 0 && y <= height;
    });
  };

  const updateGraphZoom = (nextZoom: number) => {
    const nextClampedZoom = clampGraphZoom(nextZoom);
    syncGraphZoomState(nextClampedZoom);
    chartRef.current?.getEchartsInstance?.().setOption?.(
      {
        series: [
          {
            zoom: nextClampedZoom,
          },
        ],
      },
      {
        lazyUpdate: false,
        notMerge: false,
        silent: true,
      },
    );
    window.requestAnimationFrame(configureGraphRoamController);
  };

  useEffect(() => {
    setExpandedPathIds(new Set());
  }, [selectedNode?.id]);

  useEffect(() => {
    setDraggedNodePositions(new Map());
  }, [report]);

  useEffect(() => {
    const element = graphContainerRef.current;
    if (!element) {
      return;
    }

    const updateGraphWidth = () => {
      const nextWidth = Math.round(element.getBoundingClientRect().width);
      setGraphWidth((currentWidth) =>
        currentWidth === nextWidth ? currentWidth : nextWidth,
      );
    };

    updateGraphWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateGraphWidth);
      return () => {
        window.removeEventListener('resize', updateGraphWidth);
      };
    }

    const observer = new ResizeObserver(updateGraphWidth);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(
    () => () => {
      if (graphZoomSyncRafRef.current !== null) {
        window.cancelAnimationFrame(graphZoomSyncRafRef.current);
      }
    },
    [],
  );

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
  }, [graphHeight, graphWidth, nodes.length, edges.length]);

  const hoveredPath = selectedNodePaths.find(
    (path) => path.id === hoveredPathId,
  );
  const activeSnippetPath = selectedNode
    ? (hoveredPath ?? selectedNodePaths[0])
    : undefined;
  const activePathImportSnippets = useMemo(() => {
    if (!activeSnippetPath) {
      return new Map();
    }

    return getPathParentImportSnippetLabels(activeSnippetPath, edgeMap);
  }, [activeSnippetPath, edgeMap]);

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
    const hasSearch = Boolean(searchQuery.trim());
    const maxEmittedSize = Math.max(
      1,
      ...nodes.map((item) => item.totalEmittedSize),
    );
    const nodePositions = new Map(layout.positions);
    draggedNodePositions.forEach((position, nodeId) => {
      nodePositions.set(nodeId, position);
    });
    const positionedNodes = [...nodePositions.values()];
    const boundaryPadding = isLargeGraph ? 720 : 240;
    const positionedXs = positionedNodes.map((position) => position.x);
    const positionedYs = positionedNodes.map((position) => position.y);
    let boundaryMinX = positionedNodes.length
      ? Math.min(...positionedXs) - boundaryPadding
      : 0;
    let boundaryMaxX = positionedNodes.length
      ? Math.max(...positionedXs) + boundaryPadding
      : 1;
    let boundaryMinY = positionedNodes.length
      ? Math.min(...positionedYs) - boundaryPadding
      : 0;
    let boundaryMaxY = positionedNodes.length
      ? Math.max(...positionedYs) + boundaryPadding
      : 1;
    const viewAspect = Math.max(
      1,
      (graphWidth || (graphHeight * 16) / 9) / Math.max(1, graphHeight),
    );
    const boundaryWidth = Math.max(1, boundaryMaxX - boundaryMinX);
    const boundaryHeight = Math.max(1, boundaryMaxY - boundaryMinY);
    const boundaryAspect = boundaryWidth / boundaryHeight;

    if (boundaryAspect > viewAspect) {
      const nextHeight = boundaryWidth / viewAspect;
      const heightOffset = (nextHeight - boundaryHeight) / 2;
      boundaryMinY -= heightOffset;
      boundaryMaxY += heightOffset;
    } else {
      const nextWidth = boundaryHeight * viewAspect;
      const widthOffset = (nextWidth - boundaryWidth) / 2;
      boundaryMinX -= widthOffset;
      boundaryMaxX += widthOffset;
    }

    const dataAspect =
      (boundaryMaxX - boundaryMinX) / Math.max(1, boundaryMaxY - boundaryMinY);
    const nodeShapeStretch = Math.max(
      0.25,
      Math.min(4, dataAspect / viewAspect),
    );
    const getCircleSymbolSize = (diameter: number): [number, number] => [
      diameter,
      diameter / nodeShapeStretch,
    ];

    const graphNodes = nodes.map((node) => {
      const position = nodePositions.get(node.id) ?? { x: 0, y: 0 };
      const baseColor = getBaseNodeColor(node);
      const isMatched = matchedNodeIds.has(node.id);
      const isOnHighlight = highlightNodeIds.has(node.id);
      const symbolSize =
        getNodeSymbolSize(node, maxEmittedSize) *
        (isLargeGraph ? LARGE_GRAPH_NODE_SCALE : 1);

      let opacity = 1;
      if (hasSelection) {
        opacity = isOnHighlight ? 1 : 0.16;
      } else if (hasSearch) {
        opacity = isMatched ? 1 : 0.16;
      }
      const shouldShowLabel =
        opacity > 0.3 &&
        (!isLargeGraph ||
          node.isInitial ||
          node.removableJSSize > 0 ||
          isOnHighlight ||
          (hasSearch && isMatched));

      const borderColor =
        selectedNode?.id === node.id
          ? NODE_SELECTED_BORDER
          : isOnHighlight
            ? EDGE_HIGHLIGHT_COLOR
            : baseColor.border;
      const importSnippet = activePathImportSnippets.get(node.id);
      const shouldShowImportSnippet = Boolean(importSnippet) && isOnHighlight;
      const baseLabel = `${normalizeGraphLabel(node.name, 30)}\n${formatSize(
        node.totalEmittedSize,
      )}`;
      const labelFormatter = shouldShowImportSnippet
        ? `{file|${importSnippet!.file}}\n{snippet|${
            importSnippet!.code
          }}\n{name|${normalizeGraphLabel(
            node.name,
            30,
          )}}\n{size|${formatSize(node.totalEmittedSize)}}`
        : baseLabel;

      return {
        id: node.id,
        name: node.name,
        symbol: 'circle' as const,
        x: position.x,
        y: position.y,
        value: node.totalEmittedSize,
        symbolSize: getCircleSymbolSize(symbolSize),
        itemStyle: {
          color:
            hasSelection && !isOnHighlight ? MUTED_NODE : baseColor.background,
          borderColor:
            hasSelection && !isOnHighlight ? MUTED_BORDER : borderColor,
          borderWidth: selectedNode?.id === node.id ? 4 : 2,
          opacity,
          shadowBlur: selectedNode?.id === node.id ? 12 : 0,
          shadowColor: 'rgba(17,24,39,0.25)',
        },
        label: {
          show: shouldShowLabel || shouldShowImportSnippet,
          position: shouldShowImportSnippet
            ? ('top' as const)
            : ('bottom' as const),
          distance: shouldShowImportSnippet ? 14 : 10,
          width: shouldShowImportSnippet ? 320 : NODE_LABEL_WIDTH,
          overflow: 'truncate' as const,
          lineHeight: shouldShowImportSnippet ? 18 : 16,
          align: 'center' as const,
          color: '#111827',
          fontSize: 12,
          fontWeight: selectedNode?.id === node.id ? 700 : 500,
          formatter: labelFormatter,
          rich: {
            snippet: {
              color: '#f9fafb',
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              borderRadius: 4,
              padding: [4, 6],
              fontFamily: 'monospace',
              fontSize: 11,
              lineHeight: 18,
            },
            file: {
              color: '#e2e8f0',
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              borderRadius: 4,
              padding: [4, 6, 0, 6],
              fontFamily: 'monospace',
              fontSize: 11,
              fontWeight: 700,
              lineHeight: 16,
            },
            name: {
              color: '#111827',
              fontWeight: 700,
              fontSize: 12,
              lineHeight: 18,
            },
            size: {
              color: '#111827',
              fontSize: 12,
              lineHeight: 16,
            },
          },
        },
      };
    });
    const boundaryPoints = positionedNodes.length
      ? [
          [boundaryMinX, boundaryMinY],
          [boundaryMaxX, boundaryMinY],
          [boundaryMinX, boundaryMaxY],
          [boundaryMaxX, boundaryMaxY],
        ]
      : [];
    const graphBoundaryNodes = boundaryPoints.map(([x, y], index) => ({
      id: `${GRAPH_BOUNDARY_NODE_ID_PREFIX}${index}`,
      name: '',
      x,
      y,
      silent: true,
      symbol: 'circle' as const,
      symbolSize: 2,
      itemStyle: {
        borderColor: 'rgba(0,0,0,0)',
        color: 'rgba(0,0,0,0.001)',
        opacity: 0.001,
      },
      label: {
        show: false,
      },
      tooltip: {
        show: false,
      },
      emphasis: {
        disabled: true,
      },
    }));
    const graphEdges = edges.map((edge) => {
      const highlight = highlightEdgeIds.has(edge.id);
      const matchesSearch =
        matchedNodeIds.has(edge.from) || matchedNodeIds.has(edge.to);
      let opacity = 0.6;
      if (hasSelection) {
        opacity = highlight ? 0.95 : 0.08;
      } else if (hasSearch) {
        opacity = matchesSearch ? 0.65 : 0.06;
      }

      return {
        id: edge.id,
        source: edge.from,
        target: edge.to,
        value: edge.imports.length,
        lineStyle: {
          color: highlight ? EDGE_HIGHLIGHT_COLOR : EDGE_COLOR,
          width: highlight ? 3 : 1.5,
          opacity,
          curveness: 0.12,
        },
        label: {
          show: false,
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
          symbol: 'circle',
          left: 8,
          right: 8,
          top: 8,
          bottom: 8,
          layout: 'none',
          roam: 'move',
          draggable: true,
          nodeScaleRatio: 0 as any,
          zoom: graphZoomRef.current ?? defaultGraphZoom,
          scaleLimit: {
            min: GRAPH_MIN_ZOOM,
            max: GRAPH_MAX_ZOOM,
          },
          edgeSymbol: ['none', 'arrow'],
          edgeSymbolSize: [0, 8],
          edgeLabel: {
            show: false,
          },
          data: [...graphNodes, ...graphBoundaryNodes],
          links: graphEdges,
          lineStyle: {
            opacity: 0.65,
            width: 1.5,
          },
          labelLayout: {
            hideOverlap: activePathImportSnippets.size === 0,
          },
          emphasis: {
            focus: 'adjacency',
            edgeLabel: {
              show: false,
            },
          },
        },
      ],
    };
  }, [
    activePathImportSnippets,
    edgeMap,
    edges,
    defaultGraphZoom,
    draggedNodePositions,
    graphHeight,
    graphWidth,
    highlightEdgeIds,
    highlightNodeIds,
    hoveredPath,
    isLargeGraph,
    layout,
    matchedNodeIds,
    nodeMap,
    nodes,
    searchQuery,
    selectedEdge,
    selectedNode,
  ]);

  useEffect(() => {
    const rafId = window.requestAnimationFrame(configureGraphRoamController);
    const timer = window.setTimeout(configureGraphRoamController, 120);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timer);
    };
  }, [graphHeight, graphWidth, option]);

  useEffect(() => {
    const chart = chartRef.current?.getEchartsInstance?.();
    const zr = chart?.getZr?.();
    if (!zr) {
      return;
    }

    const handleMouseDown = (event: any) => {
      if (event.target) {
        blankPointerRef.current = null;
        return;
      }

      const point = getZRenderEventPoint(event);
      blankPointerRef.current = {
        x: point.x,
        y: point.y,
        dragged: false,
      };
    };

    const handleMouseMove = (event: any) => {
      const pointer = blankPointerRef.current;
      if (!pointer) {
        return;
      }

      const point = getZRenderEventPoint(event);
      if (Math.hypot(point.x - pointer.x, point.y - pointer.y) > 5) {
        pointer.dragged = true;
      }
    };

    const handleMouseUp = (event: any) => {
      const pointer = blankPointerRef.current;
      blankPointerRef.current = null;
      if (!pointer || event.target || pointer.dragged) {
        return;
      }

      const point = getZRenderEventPoint(event);
      if (Math.hypot(point.x - pointer.x, point.y - pointer.y) > 5) {
        return;
      }

      setSelectedEdgeId(null);
      setSelectedNodeId(null);
      setHoveredPathId(null);
    };

    zr.on('mousedown', handleMouseDown);
    zr.on('mousemove', handleMouseMove);
    zr.on('mouseup', handleMouseUp);

    return () => {
      zr.off('mousedown', handleMouseDown);
      zr.off('mousemove', handleMouseMove);
      zr.off('mouseup', handleMouseUp);
    };
  }, [option]);

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
  const selectedNodePathList = selectedNode ? (
    <div>
      <Typography.Title level={5}>
        Load Paths From Entry ({selectedNode.pathCount})
      </Typography.Title>
      {selectedNode.pathsTruncated ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Showing the first {report?.pathLimit ?? selectedNode.pathCount} paths
          for this group. The full path set is larger.
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
                    {path.unnecessaryModuleCount >
                    path.topUnnecessaryModules.length ? (
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
  ) : null;

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

          <Row gutter={[16, 16]} align="top">
            <Col xs={24} xl={16}>
              <div ref={graphContainerRef}>
                <Card bodyStyle={{ padding: 0, position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      zIndex: 2,
                      padding: '6px 8px',
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.92)',
                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)',
                    }}
                  >
                    <Space size="small">
                      <Button
                        size="small"
                        onClick={() =>
                          updateGraphZoom(graphZoom - GRAPH_ZOOM_STEP)
                        }
                        disabled={graphZoom <= GRAPH_MIN_ZOOM}
                      >
                        -
                      </Button>
                      <Typography.Text
                        type="secondary"
                        style={{ minWidth: 48, textAlign: 'center' }}
                      >
                        {Math.round(graphZoom * 100)}%
                      </Typography.Text>
                      <Button
                        size="small"
                        onClick={() =>
                          updateGraphZoom(graphZoom + GRAPH_ZOOM_STEP)
                        }
                        disabled={graphZoom >= GRAPH_MAX_ZOOM}
                      >
                        +
                      </Button>
                      <Button
                        size="small"
                        onClick={() => updateGraphZoom(defaultGraphZoom)}
                      >
                        Reset zoom
                      </Button>
                      {draggedNodePositions.size ? (
                        <Button
                          size="small"
                          onClick={() => setDraggedNodePositions(new Map())}
                        >
                          Reset layout
                        </Button>
                      ) : null}
                    </Space>
                  </div>
                  <ReactEChartsCore
                    ref={chartRef}
                    echarts={echarts}
                    option={option}
                    notMerge
                    style={{
                      cursor: 'grab',
                      height: graphHeight,
                      width: '100%',
                    }}
                    onEvents={{
                      graphRoam: syncGraphZoomFromChart,
                      drag: storeDraggedNodePosition,
                      mouseup: storeDraggedNodePosition,
                      dragend: storeDraggedNodePosition,
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
              </div>
            </Col>

            <Col xs={24} xl={8}>
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
                  <Space
                    direction="vertical"
                    style={{ width: '100%' }}
                    size="middle"
                  >
                    {selectedNodePathList}

                    <div>
                      <Typography.Title level={5} style={{ marginBottom: 8 }}>
                        {selectedNode.name}
                      </Typography.Title>
                      <Space wrap>
                        <Tag color={selectedNode.isInitial ? 'blue' : 'green'}>
                          {selectedNode.isInitial ? 'Entry' : 'Async'}
                        </Tag>
                        <Tag>
                          {formatSize(selectedNode.totalEmittedSize)} emitted
                        </Tag>
                        <Tag>
                          {formatSize(selectedNode.groupTotalJSSize)} JS total
                        </Tag>
                        <Tag
                          color={
                            selectedNode.removableJSSize ? 'gold' : 'default'
                          }
                        >
                          {formatSize(selectedNode.removableJSSize)} removable
                          on path
                        </Tag>
                        <Tag
                          color={
                            selectedNode.localRemovableJSSize
                              ? 'default'
                              : 'default'
                          }
                        >
                          {formatSize(selectedNode.localRemovableJSSize)} in
                          group
                        </Tag>
                        {selectedNode.inheritedRemovableJSSize > 0 ? (
                          <Tag color="cyan">
                            {formatSize(selectedNode.inheritedRemovableJSSize)}{' '}
                            already loaded before
                          </Tag>
                        ) : null}
                      </Space>
                      <div style={{ marginTop: 8 }}>
                        <Typography.Text type="secondary">
                          Reachable modules: {selectedNode.reachableModuleCount}{' '}
                          / {selectedNode.actualModuleCount}
                        </Typography.Text>
                      </div>
                    </div>

                    <div>
                      <Typography.Title level={5}>
                        Chunks In This Group
                      </Typography.Title>
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
                              <Typography.Text strong>
                                {chunk.name}
                              </Typography.Text>
                              <div style={{ marginTop: 6 }}>
                                <Space wrap>
                                  <Tag>
                                    {formatSize(chunk.emittedSize)} emitted
                                  </Tag>
                                  <Tag>
                                    {formatSize(chunk.totalJSSize)} JS total
                                  </Tag>
                                  <Tag>{chunk.moduleCount} modules</Tag>
                                </Space>
                              </div>
                              {chunk.files.length ? (
                                <div style={{ marginTop: 8 }}>
                                  {chunk.files.map((file) => (
                                    <div key={file}>
                                      <Typography.Text code>
                                        {file}
                                      </Typography.Text>
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
                            No inbound async import() origins were captured for
                            this group.
                          </Typography.Text>
                        )}
                      </Space>
                    </div>

                    <div>
                      <Typography.Title level={5}>
                        Incremental Removable JS Modules (
                        {selectedNode.removableJSModuleCount})
                      </Typography.Title>
                      {selectedNode.inheritedRemovableJSModuleCount > 0 ? (
                        <Typography.Text
                          type="secondary"
                          style={{ fontSize: 12 }}
                        >
                          {formatSize(selectedNode.inheritedRemovableJSSize)} of
                          this group's local removable JS has already been
                          loaded on every entry path before reaching this group.
                        </Typography.Text>
                      ) : null}
                      {selectedNode.removableJSModules.length > 50 ? (
                        <Typography.Text
                          type="secondary"
                          style={{ fontSize: 12 }}
                        >
                          Showing top 50 modules by size.
                        </Typography.Text>
                      ) : null}
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {selectedNode.removableJSModules.length ? (
                          selectedNode.removableJSModules
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
                          Already Loaded Before This Group (
                          {selectedNode.inheritedRemovableJSModuleCount})
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
                  </Space>
                ) : null}

                {selectedEdge ? (
                  <Space
                    direction="vertical"
                    style={{ width: '100%' }}
                    size="middle"
                  >
                    <div>
                      <Typography.Title level={5} style={{ marginBottom: 8 }}>
                        {selectedEdge.fromName + ' → ' + selectedEdge.toName}
                      </Typography.Title>
                      <Tag>{selectedEdge.imports.length} import() call(s)</Tag>
                    </div>

                    <Space direction="vertical" style={{ width: '100%' }}>
                      {selectedEdge.imports.map((item, index) => (
                        <ImportCard
                          key={`${selectedEdge.id}_${index}`}
                          item={item}
                        />
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
                            <Typography.Text
                              strong
                              style={{ display: 'block' }}
                            >
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
                          <Tag>
                            {formatSize(node.groupTotalJSSize)} JS total
                          </Tag>
                          <Tag
                            color={node.removableJSSize ? 'gold' : 'default'}
                          >
                            {formatSize(node.removableJSSize)} incremental
                            removable
                          </Tag>
                          <Tag color={getSeverityTagColor(severity)}>
                            {formatSize(node.maxPathUnnecessarySize)} worst path
                            unnecessary
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
                            <Typography.Text
                              type="secondary"
                              style={{ fontSize: 12 }}
                            >
                              Worst path ratio {formatPercent(topPath.ratio)}
                            </Typography.Text>
                            {topPath.topUnnecessaryModules[0] ? (
                              <Typography.Text
                                type="secondary"
                                style={{ fontSize: 12 }}
                              >
                                Top module:{' '}
                                {topPath.topUnnecessaryModules[0].resource ??
                                  topPath.topUnnecessaryModules[0].name}{' '}
                                (
                                {formatSize(
                                  topPath.topUnnecessaryModules[0].size,
                                )}
                                )
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
