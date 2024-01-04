import React, { useState, useEffect, memo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';
import dayjs from 'dayjs';
import { ChartProps, DurationMetric, ITraceEventData } from '../types';
import { groupBy } from 'lodash-es';

interface CoordSysType { x: number; y: number; width: number; height: number; } 

const ColorMap = [
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

type LoaderType = { name: string; value: number[]; itemStyle: { normal: { color: string } }; ext?: Record<string, any> };

export const TimelineCom: React.FC<{ loaderData?: DurationMetric[]; pluginsData?: ITraceEventData[], formatterFn: Function, chartType?: string }> = memo(({ loaderData, pluginsData, formatterFn, chartType = 'normal' }) => {
  const data: LoaderType[] = [];
  let categories: string[] = [];
  const [optionsData, setOptinsData] = useState({})

  useEffect(() => {
    if (!loaderData) return;
    const _categories: string[] = []
    loaderData.forEach(_l => {
      _categories.unshift(_l.n + ' total');
      _categories.unshift(_l.n);
    });

    // Generate mock data
    loaderData.forEach(function (_loaderData, _i) {
      const typeItem = ColorMap[_i % 9];
      data.push({
        name: _loaderData.n + ' total',
        value: [_categories.indexOf(_loaderData.n + ' total'), _loaderData.s , _loaderData.e , _loaderData.e - _loaderData.s ],
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
          value: [_categories.indexOf(_loaderData.n), _loaderData.c[l].s , _loaderData.c[l].e , _loaderData.c[l].e  - _loaderData.c[l].s ],
          itemStyle: {
            normal: {
              color: ColorMap[Math.round(Math.random() * (ColorMap.length - 1))].color,
            },
          },
          ext: _loaderData.c[l].ext as ChartProps['loaders'][0]
        });
      }
    });

    categories = _categories.map((val, i) => {
      if (i % 2 !== 0) {
        return val.replace(' total', '')
      } else {
        return ''
      }
    })

  }, [loaderData]);

  useEffect(() => {
    if (!pluginsData) return;

    const _pluginsData = groupBy(pluginsData, (e: ITraceEventData) => e.pid)

    Object.keys(_pluginsData).reverse().forEach(function (key, i) {
      _pluginsData[key].forEach((_plugin) => {
        data.push({
          name: String(_plugin.pid),
          value: [i, _plugin.args.s , _plugin.args.e , _plugin.args.e - _plugin.args.s],
          itemStyle: {
            normal: {
              color: ColorMap[Math.round(Math.random() * (ColorMap.length - 1))].color,
            },
          },
          ext: _plugin
        });
      })
      categories.push(String(key.charAt(0).toUpperCase() + key.slice(1)));
    })
  }, [pluginsData])


  useEffect(() => {
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
      const height = api.size([0, 1])[1] * 0.5;
      const rectShape = echarts.graphic.clipRectByRect(
        {
          x: start[0],
          y: chartType === 'loader' ? start[1] - (categoryIndex % 2 !== 0 ? 0 : height) : start[1],
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
            x: 0
        },
        }
      );
    }
  
    const option = {
      tooltip: {
        formatter: (raw: any) => { 
          return formatterFn(raw)
        },
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
        height: categories.length > 2 ? 'auto' : chartType === 'loader' ? categories.length * 150 : categories.length * 100,
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
          interval: chartType === 'loader' ? 1 : 0,
          show: true
        },
        axisLabel: {
          inside: true,
          lineHeight: 20,
          width: 100,
          fontSize: 12,
          color: '#000',
          verticalAlign: 'bottom'
        },
        axisLine: {
          show: true
        },
        axisTick: {
          show: false
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
          data,
        }
      ],
    };
    setOptinsData(option)
  }, [loaderData, pluginsData])


  return (<ReactECharts option={optionsData} echarts={echarts} style={{ width: '100%', minHeight: '400px' }} />)
})

