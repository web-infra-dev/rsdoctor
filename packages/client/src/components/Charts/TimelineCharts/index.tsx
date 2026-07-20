import React, { useState, useEffect, memo, useMemo } from 'react';
import ReactEChartsCore from 'echarts-for-react/esm/core';
import * as echarts from 'echarts/core';
import { CustomChart } from 'echarts/charts';
import {
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

import dayjs from 'dayjs';
import { ChartProps, DurationMetric, ITraceEventData } from '../types';
import { groupBy } from '@rsdoctor/shared/collection';
import { ChartTypes, TIMELINE_PALETTE_COLORS } from '../constants';
import { useThemeToken } from 'src/utils';

interface CoordSysType {
  x: number;
  y: number;
  width: number;
  height: number;
}
type LoaderType = {
  name: string;
  value: number[];
  itemStyle: { normal: { color: string; opacity?: number } };
  ext?: Record<string, any>;
};

const LINE_HEIGHT = 46;

echarts.use([
  CustomChart,
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

export const TimelineCom: React.FC<{
  loaderData?: DurationMetric[];
  pluginsData?: ITraceEventData[];
  // rslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  formatterFn: Function;
  chartType?: ChartTypes;
  exts?: { endTimestamp: number; startTimestamp: number };
}> = memo(
  ({
    loaderData,
    pluginsData,
    formatterFn,
    chartType = ChartTypes.Normal,
    exts = null,
  }) => {
    const [optionsData, setOptionsData] = useState({});
    const themeToken = useThemeToken();

    const { data, categories } = useMemo(() => {
      const chartData: LoaderType[] = [];
      const categoryLabels: string[] = [];

      if (loaderData) {
        loaderData.forEach((loader) => {
          categoryLabels.unshift(loader.n + ' total');
          categoryLabels.unshift(loader.n);
        });

        loaderData.forEach((loader, loaderIndex) => {
          const totalColor =
            TIMELINE_PALETTE_COLORS[
              loaderIndex % TIMELINE_PALETTE_COLORS.length
            ];
          chartData.push({
            name: loader.n + ' total',
            value: [
              categoryLabels.indexOf(loader.n + ' total'),
              loader.s,
              loader.e,
              loader.e - loader.s,
            ],
            itemStyle: {
              normal: {
                color: totalColor,
                opacity: 0.34,
              },
            },
          });

          loader.c?.forEach((child, childIndex) => {
            chartData.push({
              name: loader.n,
              value: [
                categoryLabels.indexOf(loader.n),
                child.s,
                child.e,
                child.e - child.s,
              ],
              itemStyle: {
                normal: {
                  color:
                    TIMELINE_PALETTE_COLORS[
                      (loaderIndex + childIndex) %
                        TIMELINE_PALETTE_COLORS.length
                    ],
                  opacity: 0.78,
                },
              },
              ext: child.ext as ChartProps['loaders'][0],
            });
          });
        });

        for (let index = 0; index < categoryLabels.length; index++) {
          categoryLabels[index] =
            index % 2 !== 0 ? categoryLabels[index].replace(' total', '') : '';
        }
      }

      if (pluginsData) {
        const groupedPlugins = groupBy(
          pluginsData,
          (event: ITraceEventData) => event.pid,
        );

        Object.keys(groupedPlugins)
          .reverse()
          .forEach((key, groupIndex) => {
            groupedPlugins[key].forEach((plugin, pluginIndex) => {
              chartData.push({
                name: String(plugin.pid),
                value: [
                  groupIndex,
                  plugin.args.s,
                  plugin.args.e,
                  plugin.args.e - plugin.args.s,
                ],
                itemStyle: {
                  normal: {
                    color:
                      TIMELINE_PALETTE_COLORS[
                        (groupIndex + pluginIndex) %
                          TIMELINE_PALETTE_COLORS.length
                      ],
                    opacity: 0.78,
                  },
                },
                ext: plugin,
              });
            });
            categoryLabels.push(
              String(key.charAt(0).toUpperCase() + key.slice(1)),
            );
          });
      }

      return {
        data: chartData,
        categories: categoryLabels,
      };
    }, [loaderData, pluginsData]);

    useEffect(() => {
      function renderItem(
        params: { coordSys: CoordSysType },
        api: {
          value: (arg0: number) => number;
          coord: (arg0: number[]) => any;
          size: (arg0: number[]) => number[];
          style: () => string;
        },
      ) {
        const categoryIndex = api.value(0);
        const start = api.coord([api.value(1), categoryIndex]);
        const end = api.coord([api.value(2), categoryIndex]);
        const height = api.size([0, 1])[1] * 0.36;

        const rectShape = echarts.graphic.clipRectByRect(
          {
            x: start[0],
            y:
              chartType === ChartTypes.Loader
                ? start[1] - (categoryIndex % 2 !== 0 ? 0 : height * 2)
                : start[1],
            width: end[0] - start[0] || 5,
            height: height,
          },
          {
            x: params.coordSys.x,
            y: params.coordSys.y,
            width: params.coordSys.width,
            height: params.coordSys.height,
          },
        );
        return (
          rectShape && {
            type: 'rect',
            transition: ['shape'],
            shape: rectShape,
            style: api.style(),
            enterFrom: {
              style: { opacity: 0 },
              x: 0,
            },
          }
        );
      }

      const option = {
        tooltip: {
          formatter: (raw: any) => {
            return formatterFn(raw);
          },
        },
        dataZoom: [
          {
            type: 'slider',
            filterMode: 'weakFilter',
            showDataShadow: false,
            top: -8,
            height: 14,
            borderColor: themeToken.colorBorderSecondary,
            backgroundColor: themeToken.colorFillQuaternary,
            fillerColor: themeToken.colorPrimaryBg,
            handleStyle: {
              color: themeToken.colorTextSecondary,
              borderColor: themeToken.colorBorder,
            },
          },
          {
            type: 'inside',
            filterMode: 'weakFilter',
          },
        ],
        grid: {
          top: 18,
          left: 12,
          bottom: 12,
          right: 16,
          height:
            categories.length > (chartType === ChartTypes.Loader ? 6 : 3)
              ? 'auto'
              : categories.length * LINE_HEIGHT,
          containLabel: true,
        },
        xAxis: {
          interval:
            exts?.endTimestamp && exts?.startTimestamp
              ? Math.floor((exts.endTimestamp - exts.startTimestamp) / 8)
              : null,
          position: 'top',
          splitLine: {
            show: true,
            lineStyle: {
              color: themeToken.colorBorderSecondary,
              width: 1,
            },
          },
          scale: true,
          axisLine: {
            show: false,
          },
          axisLabel: {
            color: themeToken.colorTextSecondary,
            fontSize: 11,
            margin: 10,
            formatter(val: number) {
              return dayjs(val as number).format('HH:mm:ss:SSS');
            },
          },
        },
        yAxis: {
          type: 'category',
          splitLine: {
            show: false,
          },
          axisLabel: {
            inside: false,
            lineHeight: 20,
            width: chartType === ChartTypes.Loader ? 220 : 140,
            overflow: 'truncate',
            margin: 16,
            fontSize: 12,
            color: themeToken.colorTextSecondary,
            verticalAlign: 'middle',
          },
          axisLine: {
            show: false,
          },
          axisTick: {
            show: false,
          },
          data: categories,
        },
        series: [
          {
            type: 'custom',
            renderItem,
            itemStyle: {
              opacity: 1,
            },
            encode: {
              x: [1, 2],
              y: 0,
            },
            data,
          },
        ],
      };
      setOptionsData(option);
    }, [categories, chartType, data, exts, formatterFn, themeToken]);

    const categoryCount = loaderData
      ? loaderData.length * 2
      : new Set(pluginsData?.map((item) => item.pid)).size;
    const chartHeight =
      chartType === ChartTypes.Minify
        ? 100
        : chartType === ChartTypes.Loader
          ? Math.min(Math.max(categoryCount * LINE_HEIGHT + 80, 300), 1000)
          : Math.min(Math.max(categoryCount * LINE_HEIGHT + 70, 200), 1000);

    return (
      <ReactEChartsCore
        option={optionsData}
        echarts={echarts}
        style={{
          width: '100%',
          height: `${chartHeight}px`,
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
        }}
      />
    );
  },
);
