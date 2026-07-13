import React, { useState, useEffect, useMemo, memo } from 'react';
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
import { groupBy } from 'es-toolkit/compat';
import { ChartTypes, PALETTE_COLORS } from '../constants';
import { useTheme, useThemeToken } from 'src/utils';

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

const LINE_HEIGHT = 60;
const DARK_MODE_LOADER_BAR_OPACITY = 0.6;

function buildTimelineData(
  loaderData?: DurationMetric[],
  pluginsData?: ITraceEventData[],
) {
  const data: LoaderType[] = [];
  const categories: string[] = [];

  if (loaderData) {
    const loaderCategories: string[] = [];
    loaderData.forEach((_l) => {
      loaderCategories.unshift(_l.n + ' total');
      loaderCategories.unshift(_l.n);
    });

    loaderData.forEach((_loaderData) => {
      data.push({
        name: _loaderData.n + ' total',
        value: [
          loaderCategories.indexOf(_loaderData.n + ' total'),
          _loaderData.s,
          _loaderData.e,
          _loaderData.e - _loaderData.s,
        ],
        itemStyle: {
          normal: {
            color: PALETTE_COLORS[Math.floor(Math.random() * 27)],
            opacity: 0.25,
          },
        },
      });

      if (!_loaderData?.c) return;
      for (let l = 0; l < _loaderData.c.length; l++) {
        data.push({
          name: _loaderData.n,
          value: [
            loaderCategories.indexOf(_loaderData.n),
            _loaderData.c[l].s,
            _loaderData.c[l].e,
            _loaderData.c[l].e - _loaderData.c[l].s,
          ],
          itemStyle: {
            normal: {
              color: PALETTE_COLORS[Math.floor(Math.random() * 27)],
              opacity: 0.25,
            },
          },
          ext: _loaderData.c[l].ext as ChartProps['loaders'][0],
        });
      }
    });

    categories.push(
      ...loaderCategories.map((val, i) =>
        i % 2 !== 0 ? val.replace(' total', '') : '',
      ),
    );
  }

  if (pluginsData) {
    const plugins = groupBy(pluginsData, (e: ITraceEventData) => e.pid);

    Object.keys(plugins)
      .reverse()
      .forEach((key, i) => {
        plugins[key].forEach((_plugin) => {
          data.push({
            name: String(_plugin.pid),
            value: [
              i,
              _plugin.args.s,
              _plugin.args.e,
              _plugin.args.e - _plugin.args.s,
            ],
            itemStyle: {
              normal: {
                color: PALETTE_COLORS[Math.floor(Math.random() * 27)],
                opacity: 0.25,
              },
            },
            ext: _plugin,
          });
        });
        categories.push(String(key.charAt(0).toUpperCase() + key.slice(1)));
      });
  }

  return { data, categories };
}

export const TimelineCom: React.FC<{
  loaderData?: DurationMetric[];
  pluginsData?: ITraceEventData[];
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
    const { isDark } = useTheme();
    const themeToken = useThemeToken();
    const { data, categories } = useMemo(
      () => buildTimelineData(loaderData, pluginsData),
      [loaderData, pluginsData],
    );
    const themedData = useMemo(() => {
      if (!isDark || chartType !== ChartTypes.Loader) {
        return data;
      }

      return data.map((item) => ({
        ...item,
        itemStyle: {
          normal: {
            ...item.itemStyle.normal,
            opacity: DARK_MODE_LOADER_BAR_OPACITY,
          },
        },
      }));
    }, [chartType, data, isDark]);

    // Register the required components
    echarts.use([
      CustomChart,
      TooltipComponent,
      GridComponent,
      DataZoomComponent,
      CanvasRenderer,
    ]);

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
        const height = api.size([0, 1])[1] * 0.3;

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
            top: -10,
          },
          {
            type: 'inside',
            filterMode: 'weakFilter',
          },
        ],
        grid: {
          top: 10,
          left: 0,
          bottom: 10,
          right: 0,
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
          },
          scale: true,
          axisLine: {
            show: false,
          },
          axisLabel: {
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
            inside: true,
            lineHeight: 20,
            width: 100,
            fontSize: 12,
            color: themeToken.colorText,
            verticalAlign: 'bottom',
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
              opacity: 0.8,
            },
            encode: {
              x: [1, 2],
              y: 0,
            },
            data: themedData,
          },
        ],
      };
      setOptionsData(option);
    }, [chartType, exts, formatterFn, themeToken, categories, themedData]);

    return (
      <ReactEChartsCore
        option={optionsData}
        echarts={echarts}
        style={{
          width: '100%',
          minHeight:
            chartType === ChartTypes.Loader
              ? '500px'
              : chartType === ChartTypes.Minify
                ? '100px'
                : '200px',
          maxHeight: chartType === ChartTypes.Minify ? '100px' : '1000px',
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
        }}
      />
    );
  },
);
