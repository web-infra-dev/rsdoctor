import React, { useEffect, useState, memo, useMemo } from 'react';
import EChartsReactCore from 'echarts-for-react/esm/core';
import * as echarts from 'echarts/core';
import { TreemapChart } from 'echarts/charts';
import { TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { BUNDLE_ANALYZER_COLORS, COLOR_GROUPS } from './constants';
import { Checkbox, Typography, Space, Tooltip, Tag, Input } from 'antd';
import {
  InfoCircleOutlined,
  SearchOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { formatSize, useI18n } from 'src/utils';
import { SearchModal } from 'src/pages/BundleSize/components/search-modal';
import Styles from './treemap.module.scss';

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
            value: node[valueKey] || node.value || node['sourceSize'] || 0,
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

              function makeRow(
                label: string,
                value: string,
                valueColor?: string,
              ) {
                return (
                  `<div class="${Styles['tooltip-row']}">` +
                  `<span class="${Styles['tooltip-label']}">${label}</span>` +
                  `<span${valueColor ? ` style="color: ${valueColor}"` : ''}>${value}</span>` +
                  '</div>'
                );
              }
              return [
                `<div class="${Styles['tooltip-path']}">` +
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
              emphasis: {
                focus: 'self',
              },
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
        <div
          style={{
            width: '100%',
            minHeight: '500px',
            maxHeight: '1000px',
            border: '5px solid white',
            borderRadius: '10px',
            ...style,
          }}
          className={Styles['chart-container']}
        >
          <EChartsReactCore
            ref={chartRef}
            option={option}
            echarts={echarts}
            onEvents={onChartClick ? { click: onChartClick } : undefined}
            style={{ width: '100%', height: '100%' }}
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
}> = ({ treeData, onChartClick, bundledSize = false }) => {
  const assetNames = useMemo(
    () => treeData.map((item) => item.name),
    [treeData],
  );
  const [checkedAssets, setCheckedAssets] = useState<string[]>(assetNames);
  const [collapsed, setCollapsed] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [filterKeyword, setFilterKeyword] = useState('');
  const chartRef = React.useRef<any>(null);
  const { t } = useI18n();

  const filteredTreeData = useMemo(
    () => treeData.filter((item) => checkedAssets.includes(item.name)),
    [treeData, checkedAssets],
  );

  const visibleAssetNames = useMemo(() => {
    if (!filterKeyword) return assetNames;
    return assetNames.filter((name) =>
      name.toLowerCase().includes(filterKeyword.toLowerCase()),
    );
  }, [assetNames, filterKeyword]);

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

      // Clear previous highlight and set new highlight with a delay
      echartsInstance.dispatchAction({
        type: 'downplay',
        seriesId: 'bundle-treemap',
      });

      setTimeout(() => {
        echartsInstance.dispatchAction({
          type: 'highlight',
          seriesId: 'bundle-treemap',
          targetNodeId: nodeId.toString(),
        });
      }, 500);
    }
    setSearchModalOpen(false);
  };

  const onAssetCheck = (name: string, checked: boolean) => {
    if (checked) {
      setCheckedAssets((prev) => [...prev, name]);
    } else {
      setCheckedAssets((prev) => prev.filter((n) => n !== name));
    }
  };

  const onAllCheck = (e: any) => {
    if (e.target.checked) {
      if (!filterKeyword) {
        setCheckedAssets(assetNames);
      } else {
        const newAssets = new Set([...checkedAssets, ...visibleAssetNames]);
        setCheckedAssets(Array.from(newAssets));
      }
    } else {
      if (!filterKeyword) {
        setCheckedAssets([]);
      } else {
        setCheckedAssets(
          checkedAssets.filter((a) => !visibleAssetNames.includes(a)),
        );
      }
    }
  };

  const isAllChecked =
    visibleAssetNames.length > 0 &&
    visibleAssetNames.every((name) => checkedAssets.includes(name));
  const isIndeterminate =
    visibleAssetNames.some((name) => checkedAssets.includes(name)) &&
    !isAllChecked;

  return (
    <div
      className={Styles.treemap}
      style={{
        position: 'relative',
        height: 'calc(100vh - 200px)',
        minHeight: '600px',
        border: '1px solid #f0f0f0',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      {/* Sidebar Container (Floating) */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 10,
          display: 'flex',
          pointerEvents: 'none', // Allow clicks to pass through container
        }}
      >
        {/* Sidebar Content */}
        <div
          style={{
            width: collapsed ? 0 : 280,
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.2s ease',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(4px)',
            boxShadow: collapsed ? 'none' : '4px 0 8px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            pointerEvents: 'auto', // Re-enable clicks for sidebar
            borderRight: collapsed ? 'none' : '1px solid #f0f0f0',
          }}
        >
          <div
            style={{
              padding: '12px',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <div style={{ marginBottom: 8, fontWeight: 600 }}>
              {t('Show chunks')}
            </div>
            <Input
              placeholder={t('Filter chunks...')}
              prefix={<SearchOutlined style={{ color: '#ccc' }} />}
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              allowClear
              size="small"
            />
            <div style={{ marginTop: 8 }}>
              <Checkbox
                checked={isAllChecked}
                indeterminate={isIndeterminate}
                onChange={onAllCheck}
              >
                {t('All')}
              </Checkbox>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
            {visibleAssetNames.map((name) => (
              <div
                key={name}
                style={{
                  marginBottom: 6,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                <Checkbox
                  checked={checkedAssets.includes(name)}
                  onChange={(e) => onAssetCheck(name, e.target.checked)}
                >
                  <Tooltip title={name} placement="right">
                    {name}
                  </Tooltip>
                </Checkbox>
              </div>
            ))}
          </div>
        </div>

        {/* Toggle Button */}
        <div
          style={{
            width: 16,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            pointerEvents: 'auto',
          }}
          onClick={() => setCollapsed(!collapsed)}
        >
          <div
            style={{
              width: 16,
              height: 48,
              background: '#fff',
              border: '1px solid #f0f0f0',
              borderLeft: 'none',
              borderRadius: '0 4px 4px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '2px 0 4px rgba(0,0,0,0.05)',
            }}
          >
            {collapsed ? (
              <RightOutlined style={{ fontSize: 10 }} />
            ) : (
              <LeftOutlined style={{ fontSize: 10 }} />
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#fff',
            paddingLeft: collapsed ? 32 : 300, // Add padding to avoid overlap with sidebar
            transition: 'padding-left 0.2s ease',
          }}
        >
          <Space>
            <Typography.Text strong>{t('Assets Treemap')}</Typography.Text>
            <Tag color="blue">
              {bundledSize ? 'Bundled Size' : 'Source Size'}
            </Tag>
            <Tooltip
              title={
                <span>
                  ✨ In Rspack, TreeMap proportions are always based on Bundled
                  Size by default.
                  <br />
                  ✨ In Webpack, TreeMap proportions are based on Bundled Size
                  only when SourceMap is enabled.
                  <br />✨ <b>Bundled Size</b>: The size of a module after
                  bundling and minification.
                  <br />✨ <b>Source Size</b>: The size of a module after
                  compilation (e.g., TypeScript/JSX to JS), but before bundling
                  and minification.
                  <br />✨ <b>Gzipped Size</b>: The compressed file size that
                  users actually download, as most web servers use gzip
                  compression.
                  <br />
                </span>
              }
              overlayInnerStyle={{ width: 620, color: 'black' }}
              color="white"
            >
              <InfoCircleOutlined style={{ color: '#1890ff' }} />
            </Tooltip>
          </Space>
          <Space>
            <SearchModal
              onModuleClick={handleModuleClick}
              open={searchModalOpen}
              setOpen={setSearchModalOpen}
              isIcon={false}
            />
          </Space>
        </div>
        <div style={{ flex: 1, padding: 16, overflow: 'hidden' }}>
          <TreeMap
            ref={chartRef}
            treeData={filteredTreeData}
            valueKey={bundledSize ? 'bundledSize' : 'sourceSize'}
            onChartClick={onChartClick}
            style={{
              height: '100%',
              minHeight: 'auto',
              maxHeight: 'none',
              border: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
};
