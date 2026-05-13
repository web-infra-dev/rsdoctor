import React, { useCallback, useMemo, useRef, useState } from 'react';
import EChartsReactCore from 'echarts-for-react/esm/core';
import * as echarts from 'echarts/core';
import {
  GraphChart,
  TreemapChart,
  type GraphSeriesOption,
  type TreemapSeriesOption,
} from 'echarts/charts';
import {
  TooltipComponent,
  LegendComponent,
  type TooltipComponentOption,
  type LegendComponentOption,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { ComposeOption } from 'echarts/core';
import { Alert, Empty, Input, Space, Switch, Typography } from 'antd';
import { SDK } from '@rsdoctor/types';
import { formatSize } from 'src/utils';
import { DetailPanel, PackageNodeInfo } from './DetailPanel';
import { buildPackageSizeTreemapData } from './packageSizeTreemap';

echarts.use([
  GraphChart,
  TreemapChart,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
]);

type GraphOption = ComposeOption<
  GraphSeriesOption | TooltipComponentOption | LegendComponentOption
>;

type TreemapOption = ComposeOption<
  TreemapSeriesOption | TooltipComponentOption | LegendComponentOption
>;

// Node colors
const COLOR_NORMAL = '#4dabf7'; // blue – regular package
const COLOR_DUPLICATE = '#ff6b6b'; // red  – duplicate package
const COLOR_SOURCE = '#51cf66'; // green – user source code (virtual root)
const TREEMAP_COLORS = [
  '#4dabf7',
  '#51cf66',
  '#ffd43b',
  '#ff922b',
  '#845ef7',
  '#20c997',
  '#f06595',
  '#15aabf',
  '#adb5bd',
];

// Min/max node symbol sizes
const MIN_SIZE = 16;
const MAX_SIZE = 60;

function normalize(val: number, min: number, max: number): number {
  if (max === min) return MIN_SIZE;
  return MIN_SIZE + ((val - min) / (max - min)) * (MAX_SIZE - MIN_SIZE);
}

interface GraphViewProps {
  packages: SDK.PackageData[];
  dependencies: SDK.PackageDependencyData[];
}

export const GraphView: React.FC<GraphViewProps> = ({
  packages,
  dependencies,
}) => {
  const chartRef = useRef<EChartsReactCore>(null);
  const [selectedPkg, setSelectedPkg] = useState<PackageNodeInfo | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

  const duplicateNames = useMemo(() => {
    const nameCount: Record<string, number> = {};
    packages.forEach((p) => {
      nameCount[p.name] = (nameCount[p.name] ?? 0) + 1;
    });
    return new Set(
      Object.entries(nameCount)
        .filter(([, c]) => c > 1)
        .map(([n]) => n),
    );
  }, [packages]);

  const visiblePackages = useMemo(() => {
    let pkgs = packages;
    if (showDuplicatesOnly) {
      pkgs = pkgs.filter((p) => duplicateNames.has(p.name));
    }
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      pkgs = pkgs.filter((p) => p.name.toLowerCase().includes(kw));
    }
    return pkgs;
  }, [packages, keyword, showDuplicatesOnly, duplicateNames]);

  const visibleIds = useMemo(
    () => new Set(visiblePackages.map((p) => p.id)),
    [visiblePackages],
  );

  const visibleDeps = useMemo(
    () =>
      dependencies.filter(
        (d) => visibleIds.has(d.package) && visibleIds.has(d.dependency),
      ),
    [dependencies, visibleIds],
  );

  const sizes = packages.map((p) => p.size.parsedSize);
  const minSize = Math.min(...sizes);
  const maxSize = Math.max(...sizes);
  const treemapData = useMemo(
    () => buildPackageSizeTreemapData(visiblePackages),
    [visiblePackages],
  );
  const visiblePackagesSize = useMemo(
    () => treemapData.reduce((total, item) => total + item.value, 0),
    [treemapData],
  );

  const option = useMemo<GraphOption>(() => {
    const nodes: GraphSeriesOption['data'] = visiblePackages.map((pkg) => {
      const isDuplicate = duplicateNames.has(pkg.name);
      const symbolSize = normalize(pkg.size.parsedSize, minSize, maxSize);
      const label = pkg.name.startsWith('@')
        ? pkg.name.split('/').slice(0, 2).join('/')
        : pkg.name.split('/')[0];

      return {
        id: String(pkg.id),
        name: pkg.name,
        value: pkg.size.parsedSize,
        symbolSize,
        itemStyle: {
          color: isDuplicate ? COLOR_DUPLICATE : COLOR_NORMAL,
          borderColor: isDuplicate ? '#c0392b' : '#1971c2',
          borderWidth: isDuplicate ? 2 : 1,
        },
        label: {
          show: symbolSize > 24,
          formatter: label,
          fontSize: 10,
          color: '#fff',
        },
      };
    });

    const edges: GraphSeriesOption['links'] = visibleDeps.map((dep) => ({
      source: String(dep.package),
      target: String(dep.dependency),
      lineStyle: { color: '#adb5bd', width: 1, opacity: 0.6 },
    }));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            const pkg = packages.find((p) => p.id === Number(params.data.id));
            if (!pkg) return params.data.name;
            const isDup = duplicateNames.has(pkg.name);
            return [
              `<b>${pkg.name}</b> ${isDup ? '<span style="color:#ff6b6b">[DUPLICATE]</span>' : ''}`,
              `Version: ${pkg.version}`,
              `Parsed: ${formatSize(pkg.size.parsedSize)}`,
              `Gzip: ${formatSize(pkg.size.gzipSize)}`,
              `Modules: ${pkg.modules?.length ?? 0}`,
            ].join('<br/>');
          }
          return '';
        },
      },
      legend: [
        {
          data: [
            {
              name: 'Normal Package',
              itemStyle: { color: COLOR_NORMAL },
            },
            {
              name: 'Duplicate Package',
              itemStyle: { color: COLOR_DUPLICATE },
            },
            {
              name: 'Source',
              itemStyle: { color: COLOR_SOURCE },
            },
          ],
          bottom: 0,
          left: 'center',
          textStyle: { fontSize: 12 },
        },
      ],
      series: [
        {
          type: 'graph',
          layout: 'force',
          data: nodes,
          links: edges,
          roam: true,
          draggable: true,
          force: {
            repulsion: 300,
            gravity: 0.05,
            edgeLength: [80, 200],
            layoutAnimation: true,
          },
          edgeSymbol: ['none', 'arrow'],
          edgeSymbolSize: [0, 8],
          lineStyle: {
            curveness: 0.1,
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: { width: 2, color: '#339af0' },
            itemStyle: { borderWidth: 3 },
          },
          selectedMode: 'single',
          select: {
            itemStyle: { borderColor: '#f59f00', borderWidth: 3 },
          },
        },
      ],
    };
  }, [
    visiblePackages,
    visibleDeps,
    duplicateNames,
    minSize,
    maxSize,
    packages,
  ]);

  const treemapOption = useMemo<TreemapOption>(
    () => ({
      color: TREEMAP_COLORS,
      tooltip: {
        trigger: 'item',
        confine: true,
        formatter: (params: any) => {
          const data = params.data;
          if (!data) return '';
          return [
            `<b>${echarts.format.encodeHTML(data.packageName)}</b>`,
            `Version: ${echarts.format.encodeHTML(data.version)}`,
            `Parsed: ${formatSize(data.value)}`,
            `Share: ${data.percent.toFixed(2)}%`,
            `Gzip: ${formatSize(data.gzipSize)}`,
            `Source: ${formatSize(data.sourceSize)}`,
          ].join('<br/>');
        },
      },
      series: [
        {
          type: 'treemap',
          data: treemapData,
          roam: true,
          nodeClick: false,
          breadcrumb: { show: false },
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 2,
            gapWidth: 2,
          },
          label: {
            show: true,
            color: '#fff',
            fontSize: 11,
            overflow: 'truncate',
            formatter: (params: any) => {
              const data = params.data;
              if (!data) return params.name;
              return `${data.packageName}\n${data.percent.toFixed(1)}%`;
            },
          },
          upperLabel: {
            show: false,
          },
          emphasis: {
            itemStyle: {
              borderColor: '#1c7ed6',
              borderWidth: 3,
            },
          },
          levels: [
            {
              itemStyle: {
                borderColor: '#fff',
                borderWidth: 2,
                gapWidth: 2,
              },
            },
          ],
        },
      ],
    }),
    [treemapData],
  );

  const onChartClick = useCallback(
    (params: any) => {
      if (params.dataType !== 'node') return;
      const pkg = packages.find((p) => p.id === Number(params.data.id));
      if (!pkg) return;
      setSelectedPkg({ pkg, dependencies, allPackages: packages });
      setDrawerOpen(true);
    },
    [packages, dependencies],
  );

  const openPackageDetail = useCallback(
    (id: number) => {
      const pkg = packages.find((item) => item.id === id);
      if (!pkg) return;
      setSelectedPkg({ pkg, dependencies, allPackages: packages });
      setDrawerOpen(true);
    },
    [packages, dependencies],
  );

  const onTreemapClick = useCallback(
    (params: any) => {
      openPackageDetail(Number(params.data?.id));
    },
    [openPackageDetail],
  );

  if (packages.length === 0) {
    return <Empty description="No package data available" />;
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Toolbar */}
      <Space style={{ marginBottom: 12, flexWrap: 'wrap' }}>
        <Input.Search
          placeholder="Search package..."
          allowClear
          style={{ width: 260 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Space>
          <Switch
            checked={showDuplicatesOnly}
            onChange={setShowDuplicatesOnly}
            size="small"
          />
          <Typography.Text>
            Duplicates only
            {duplicateNames.size > 0 && (
              <Typography.Text type="danger" style={{ marginLeft: 4 }}>
                ({duplicateNames.size} names)
              </Typography.Text>
            )}
          </Typography.Text>
        </Space>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {visiblePackages.length} / {packages.length} packages ·{' '}
          {visibleDeps.length} dependencies
        </Typography.Text>
      </Space>

      {duplicateNames.size > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message={
            <span>
              Found <b>{duplicateNames.size}</b> packages with multiple
              versions: {Array.from(duplicateNames).slice(0, 5).join(', ')}
              {duplicateNames.size > 5
                ? ` and ${duplicateNames.size - 5} more…`
                : ''}
            </span>
          }
        />
      )}

      <EChartsReactCore
        ref={chartRef}
        echarts={echarts}
        option={option}
        style={{ height: 620, width: '100%' }}
        onEvents={{ click: onChartClick }}
        notMerge
      />

      <div style={{ marginTop: 20 }}>
        <Space
          align="baseline"
          style={{
            width: '100%',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <Typography.Title level={5} style={{ margin: 0 }}>
            Package Size Treemap
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Parsed size total: {formatSize(visiblePackagesSize)}
          </Typography.Text>
        </Space>
        {treemapData.length > 0 ? (
          <EChartsReactCore
            echarts={echarts}
            option={treemapOption}
            style={{ height: 420, width: '100%' }}
            onEvents={{ click: onTreemapClick }}
            notMerge
          />
        ) : (
          <Empty description="No package size data available" />
        )}
      </div>

      <DetailPanel
        info={selectedPkg}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
};
