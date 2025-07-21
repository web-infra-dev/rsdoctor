import React, { useEffect, useState, memo, useMemo } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { TreemapChart } from 'echarts/charts';
import { TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { BUNDLE_ANALYZER_COLORS, COLOR_GROUPS } from './constants';
import { Checkbox, Card, Typography, Space } from 'antd';
import {
  VerticalAlignBottomOutlined,
  VerticalAlignTopOutlined,
} from '@ant-design/icons';
import { formatSize, useI18n } from 'src/utils';
import { SearchModal } from 'src/pages/BundleSize/components/search-modal';

// TreeNode type should match the output of flattenTreemapData
export type TreeNode = {
  name: string;
  value?: number;
  children?: TreeNode[];
  path?: string;
  sourceSize?: number;
  bundledSize?: number;
  gzipSize?: number;
};

interface TreeMapProps {
  treeData: TreeNode[];
  valueKey?: 'sourceSize' | 'bundledSize'; // which value to show as area
  style?: React.CSSProperties;
  onChartClick?: (params: any) => void;
}

// Simple hash function for string (djb2)
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i); /* hash * 33 + c */
  }
  return hash >>> 0; // Ensure unsigned
}

function getLevelOption() {
  return [
    {
      itemStyle: {
        color: 'white',
        borderColor: '#eee',
        borderWidth: 5,
        gapWidth: 5,
      },
      emphasis: {
        itemStyle: {
          borderColor: '#a29f9f',
        },
      },
    },
    {
      colorSaturation: [0.25, 0.5],
      itemStyle: {
        borderWidth: 5,
        gapWidth: 5,
        borderColorSaturation: 0.5,
        borderColor: '#eee',
      },
    },
  ];
}

const TreeMapInner: React.FC<TreeMapProps & { forwardedRef?: React.Ref<any> }> =
  memo(
    ({
      treeData,
      valueKey = 'sourceSize',
      style,
      onChartClick,
      forwardedRef,
    }) => {
      const [option, setOption] = useState<any>(null);
      const chartRef = React.useRef<any>(null);

      // Expose chartRef to parent if forwardedRef is provided
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

      // Register ECharts components
      useEffect(() => {
        echarts.use([TreemapChart, TooltipComponent, CanvasRenderer]);
      }, []);

      useEffect(() => {
        if (!treeData) return;
        // Helper to recursively add value field for ECharts
        function convert(
          node: TreeNode,
          colorGroup: keyof typeof BUNDLE_ANALYZER_COLORS,
          level = 0,
        ): any {
          const groupColors = BUNDLE_ANALYZER_COLORS[colorGroup];
          const children = node.children?.map((c, _i) =>
            convert(c, colorGroup, level + 1),
          );

          return {
            id: node.path ? hashString(node.path) : undefined,
            name: node.name,
            value: node[valueKey] ?? node.value ?? 0,
            path: node.path,
            sourceSize: node.sourceSize ?? node.value,
            bundledSize: node.bundledSize,
            gzipSize: node.gzipSize,
            children: children && children.length > 0 ? children : undefined,
            itemStyle: {
              borderWidth: 2,
              gapWidth: 2,
              borderColorSaturation: 0.2,
              colorSaturation: 0.2,
              color: groupColors[level % groupColors.length],
              borderColor: groupColors[level % groupColors.length],
            },
            level,
          };
        }
        const data = treeData.map((item, index) => {
          const group = COLOR_GROUPS[index % COLOR_GROUPS.length];
          return convert(item, group, 0);
        });

        setOption({
          title: {
            text: 'Bundle Tree Map',
            left: 'center',
          },
          tooltip: {
            position: 'top',
            formatter: function (info: any) {
              var treePathInfo = info.treePathInfo;
              var treePath = [];
              for (var i = 1; i < treePathInfo.length; i++) {
                treePath.push(treePathInfo[i].name);
              }
              // Get extra info from node data
              var node = info.data || {};
              var path = node.path || treePath.join('/');
              var sourceSize = node.sourceSize;
              var bundledSize = node.bundledSize;
              var gzipSize = node.gzipSize;
              var level = node.level;

              const rowStyle =
                'font-size: 12px; display: flex; justify-content: space-between;';
              const labelStyle = 'color: #999;';
              const pathStyle =
                'font-size: 12px; margin-bottom: 8px; width: 280px; word-wrap: break-word; white-space: normal; word-break: break-all; line-height: 1.4; overflow-wrap: break-word;';

              function makeRow(
                label: string,
                value: string,
                valueColor?: string,
              ) {
                return (
                  '<div style="' +
                  rowStyle +
                  '">' +
                  '<span style="' +
                  labelStyle +
                  '">' +
                  label +
                  '</span>' +
                  '<span' +
                  (valueColor ? ' style="color: ' + valueColor + '"' : '') +
                  '>' +
                  value +
                  '</span>' +
                  '</div>'
                );
              }
              return [
                '<div style="' +
                  pathStyle +
                  '">' +
                  echarts.format.encodeHTML(path) +
                  '</div>',
                makeRow(
                  level === 0 ? 'Asset' : 'Source',
                  sourceSize !== undefined ? formatSize(sourceSize) : '-',
                ),
                !bundledSize
                  ? ''
                  : makeRow('Bundled', formatSize(bundledSize), '#1890ff'),
                !gzipSize
                  ? ''
                  : makeRow('Gzipped', formatSize(gzipSize), '#52c41a'),
              ].join('');
            },
          },
          series: [
            {
              name: 'Bundle Tree Map',
              id: 'bundle-treemap',
              type: 'treemap',
              visibleMin: 300,
              left: 10,
              right: 10,
              top: 10,
              bottom: 10,
              label: {
                show: true,
                formatter: '{b}',
                color: '#000',
              },
              upperLabel: {
                show: true,
                height: 30,
              },

              levels: getLevelOption(),
              data: data,
            },
          ],
        });
      }, [treeData, valueKey]);

      return option ? (
        <div>
          <ReactEChartsCore
            ref={chartRef}
            option={option}
            echarts={echarts}
            onEvents={onChartClick ? { click: onChartClick } : undefined}
            style={{
              width: '100%',
              minHeight: '500px',
              maxHeight: '1000px',
              border: '5px solid white',
              borderRadius: '10px',
              ...style,
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
}> = ({ treeData, onChartClick }) => {
  const assetNames = useMemo(
    () => treeData.map((item) => item.name),
    [treeData],
  );
  const [checkedAssets, setCheckedAssets] = useState<string[]>(assetNames);
  const [collapsed, setCollapsed] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const chartRef = React.useRef<any>(null);
  const { t } = useI18n();

  const filteredTreeData = useMemo(
    () => treeData.filter((item) => checkedAssets.includes(item.name)),
    [treeData, checkedAssets],
  );

  // Handler for search modal click
  const handleModuleClick = (module: any) => {
    if (!module?.path) return;
    const nodeId = hashString(module.path);
    if (chartRef.current) {
      const echartsInstance = chartRef.current.getEchartsInstance();
      echartsInstance.dispatchAction({
        type: 'treemapZoomToNode',
        seriesId: 'bundle-treemap',
        targetNodeId: nodeId.toString(),
      });
    }
    setSearchModalOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card
          title={
            <Space>
              <Typography.Text>{t('Output Assets List')}</Typography.Text>
              <SearchModal
                onModuleClick={handleModuleClick}
                open={searchModalOpen}
                setOpen={setSearchModalOpen}
                isIcon={true}
              />
            </Space>
          }
          extra={
            <span
              style={{ cursor: 'pointer', marginLeft: 8 }}
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? t('Expand') : t('Collapse')}
            >
              {collapsed ? (
                <VerticalAlignBottomOutlined />
              ) : (
                <VerticalAlignTopOutlined />
              )}
            </span>
          }
          size="small"
          bodyStyle={{
            overflow: 'hidden',
            height: collapsed ? 0 : undefined,
            padding: collapsed ? 0 : undefined,
            transition: 'height 0.3s cubic-bezier(.4,0,.2,1), padding 0.3s',
          }}
        >
          <div
            style={{
              opacity: collapsed ? 0 : 1,
              transition: 'opacity 0.3s',
              gap: 8,
            }}
          >
            <Checkbox
              key="all-none-checkbox"
              indeterminate={
                checkedAssets.length > 0 &&
                checkedAssets.length < assetNames.length
              }
              checked={checkedAssets.length === assetNames.length}
              onChange={(e) =>
                setCheckedAssets(e.target.checked ? assetNames : [])
              }
              style={{ marginBottom: 4 }}
            >
              {'ALL / NONE'}
            </Checkbox>
            <Checkbox.Group
              key="asset-checkbox-group"
              options={assetNames}
              value={checkedAssets}
              onChange={setCheckedAssets}
              style={{ display: 'flex', gap: 8, fontWeight: 500 }}
            />
          </div>
        </Card>
        <div style={{ flex: 1 }}>
          <TreeMap
            ref={chartRef}
            treeData={filteredTreeData}
            onChartClick={onChartClick}
          />
        </div>
      </Space>
    </div>
  );
};
