import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';
import dayjs from 'dayjs';
import { getTooltipHtmlForLoader, renderTotalLoadersTooltip } from '../utils';
import { ChartProps, DurationMetric } from '../loader';

interface CoordSysType { x: number; y: number; width: number; height: number; } 

// const Height = 25;
// TODO:: color optimize
const types = [
  { color: '#DC2626' },
  { color: '#FFE382' },
  { color: '#7B66FF' },
  { color: '#96EFFF' },
  { color: '#E25E3E' },
  { color: '#D0F288' },
  { color: '#8ADAB2' },
  { color: '#FFC5C5' },
  { color: '#3876BF' },
];

export const TimelineCom: React.FC<{ loaderData: DurationMetric[]; cwd: string; loaders: ChartProps['loaders'] }> = ({ loaderData, cwd, loaders }) => {
  const data: { name: string; value: number[]; itemStyle: { normal: { color: string } }; ext?: typeof loaders[0] }[] = [];
  const categories: string[] = [];
  useMemo(() => {
    loaderData.forEach(_l => {
      categories.unshift(_l.n + ' total');
      categories.unshift(_l.n);
    });

    // Generate mock data
    loaderData.forEach(function (_loaderData, _i) {
      const typeItem = types[_i];
      data.push({
        name: _loaderData.n + ' total',
        value: [categories.indexOf(_loaderData.n + ' total'), _loaderData.s , _loaderData.e , _loaderData.e - _loaderData.s ],
        itemStyle: {
          normal: {
            color: typeItem.color,
          },
        },
      });

      if (!_loaderData?.c) return;
      for (let l = 0; l < _loaderData?.c?.length; l++) { 
        data.push({
          name: _loaderData.n,
          value: [categories.indexOf(_loaderData.n), _loaderData.c[l].s , _loaderData.c[l].e , _loaderData.c[l].e  - _loaderData.c[l].s ],
          itemStyle: {
            normal: {
              color: types[Math.round(Math.random() * (types.length - 1))].color,
            },
          },
          ext: _loaderData.c[l].ext as typeof loaders[0]
        });
      }
    });
  }, [loaderData]);

  function renderItem(
    params: { coordSys: CoordSysType},
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
    const height = api.size([0, 1])[1] * 0.4;
    const rectShape = echarts.graphic.clipRectByRect(
      {
        x: start[0],
        y: start[1] - (categoryIndex % 2 !== 0 ? 0 : height),
        width: end[0] - start[0],
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
          x: 0
      },
      }
    );
  }

  const option = {
    tooltip: {
      formatter: (raw: any) => {
        console.log('raw:::::::', raw)
        const { name, data } = raw;
        const loaderName = name.replace(' total', '');
        if (data?.ext) {
          return getTooltipHtmlForLoader(data.ext as typeof loaders[0]);
        }

        return renderTotalLoadersTooltip(loaderName, loaders, cwd);
      }
    },
    dataZoom: [
      {
        type: 'slider',
        filterMode: 'weakFilter',
        showDataShadow: false,
        top: -10,
        labelFormatter: '',
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
      height:  loaderData?.length > 2 ? 'auto' : loaderData?.length * 150,
      containLabel: true,
    },
    xAxis: {
      position: 'top',
      splitLine: {
        show: false
      },
      scale: true,
      axisLine: {
        show: false
      },
      axisLabel: {
        formatter(val: number) {
          return dayjs(val as number).format('HH:mm:ss');
        },
      },
    },
    yAxis: {
      type: 'category',
      splitLine: {
        interval: 1,
        show: true
      },
      axisLabel: {
        inside: true,
        lineHeight: 20,
        width: 100,
        fontSize: 10,
        color: '#000',
        // overflow: 'break',
        verticalAlign: 'bottom'
      },
      axisLine: {
        show: true
      },
      axisTick: {
        show: false
      },
      data: categories.map((val, i) => {
        if (i % 2 !== 0) {
          return val.replace(' total', '')
        } else {
          return ''
        }
      }),
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
        data,
      },
    ],
  };

  return (<ReactECharts option={option} echarts={echarts} style={{ width: '100%', minHeight: '400px' }} />)
}