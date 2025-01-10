import { Loader } from '@rsdoctor/utils/common';
import { SDK } from '@rsdoctor/types';
import dayjs from 'dayjs';
import { maxBy, minBy } from 'lodash-es';
import { formatCosts } from 'src/utils';

import './tooltips.scss';
import { DurationMetric, ETraceEventPhase, ITraceEventData } from './types';
import { useEffect, useState } from 'react';

export function getTooltipHtmlForLoader(
  loader: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetLoaderChartData>[0],
) {
  return `
  <div class="loader-tooltip-container">
    <div class="loader-tooltip-title">${loader.loader}</div>
    <li class="loader-tooltip-item">
      <span>isPitch</span>
      <span>${loader.isPitch}</span>
    </li>
    ${
      loader.layer && loader.layer !== 'undefined'
        ? `<li class="loader-tooltip-item">
        <span>layer</span>
        <span>${loader.layer}</span>
      </li>`
        : ``
    }
    <li class="loader-tooltip-item">
      <span>duration</span>
      <span class="loader-tooltip-text-bold">${formatCosts(loader.costs)}</span>
    </li>
    <li class="loader-tooltip-item">
      <span>filepath</span>
      <span>${loader.resource}</span>
    </li>
    <li class="loader-tooltip-item">
      <span>start</span>
      <span class="loader-tooltip-text-bold">${dayjs(loader.startAt).format(
        'YYYY/MM/DD HH:mm:ss',
      )}</span>
    </li>
    <li class="loader-tooltip-item">
      <span>end</span>
      <span class="loader-tooltip-text-bold">${dayjs(loader.endAt).format(
        'YYYY/MM/DD HH:mm:ss',
      )}</span>
    </li>
  </div>
  `.trim();
}

export function renderTotalLoadersTooltip(
  loaderName: string,
  loaders: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetLoaderChartData>,
  cwd: string,
) {
  const filter = (loader: { loader: string }) => loader.loader === loaderName;
  const filteredLoaders = loaders.filter(filter);
  const resources = filteredLoaders.map((e) => e.resource);
  const nodeModulesResources = resources.filter((e) =>
    e.includes('/node_modules/'),
  );
  const outsideResources = resources.filter((e) => !e.startsWith(cwd));
  const start = minBy(filteredLoaders, (e) => e.startAt)!.startAt;
  const end = maxBy(filteredLoaders, (e) => e.endAt)!.endAt;

  // const duration = sumBy(filteredLoaders, (e) => e.costs);
  const duration = Loader.getLoadersCosts(filter, loaders);

  return `
<div class="loader-tooltip-container">
  <div class="loader-tooltip-title">${loaderName}</div>
  <li class="loader-tooltip-item">
    <span>files</span>
    <span class="loader-tooltip-text-bold">${resources.length}</span>
  </li>
  <li class="loader-tooltip-item">
    <span>files(node_modules)</span>
    <span class="loader-tooltip-text-bold">${nodeModulesResources.length}</span>
  </li>
  <li class="loader-tooltip-item">
    <span>files(outside the cwd)</span>
    <span class="loader-tooltip-text-bold">${outsideResources.length}</span>
  </li>
  <li class="loader-tooltip-item">
    <span>duration(estimated)</span>
    <span class="loader-tooltip-text-bold">${formatCosts(duration)}</span>
  </li>
  <li class="loader-tooltip-item">
    <span>start(min)</span>
    <span>${dayjs(start).format('YYYY/MM/DD HH:mm:ss')}</span>
  </li>
  <li class="loader-tooltip-item">
    <span>end(max)</span>
    <span>${dayjs(end).format('YYYY/MM/DD HH:mm:ss')}</span>
  </li>
  </div>
    `.trim();
}

export function transformDurationMetric(
  rawData: DurationMetric[],
): ITraceEventData[] {
  return rawData.reduce((acc, cur) => {
    if (cur.c) {
      const res = transformDurationMetric(cur.c);
      acc.push(
        {
          name: cur.n,
          ph: ETraceEventPhase.BEGIN,
          pid: cur.p,
          ts: cur.s,
          args: cur,
        },
        ...res,
        {
          name: cur.n,
          ph: ETraceEventPhase.END,
          pid: cur.p,
          ts: cur.e,
          args: cur,
        },
      );
    } else {
      acc.push({
        name: cur.n,
        ph: ETraceEventPhase.BEGIN,
        pid: cur.p,
        ts: cur.s,
        args: cur,
      });
      acc.push({
        name: cur.n,
        ph: ETraceEventPhase.END,
        pid: cur.p,
        ts: cur.e,
        args: cur,
      });
    }
    return acc;
  }, [] as ITraceEventData[]);
}

// DFS 遍历，取每层的最后一个元素与目标元素进行比较，如果目标元素可以存放至当前层，就push；如果不能就放到下一层
export function processTrans(rawData: DurationMetric[]) {
  const processedData = rawData
    .sort((a, b) => a.s - b.s)
    .reduce(
      (prev, cur) => {
        const ca = prev[cur.p];
        if (ca) {
          loop(ca, cur);
        } else {
          prev[cur.p] = [cur];
        }
        return prev;
      },
      {} as Record<string, DurationMetric[]>,
    );
  const data = Object.entries(processedData).reduce((prev, [_key, val]) => {
    // @ts-ignore
    prev.push(...val);
    return prev;
  }, [] as DurationMetric[]);
  return transformDurationMetric(data);
}

function loop(dur: DurationMetric[], target: DurationMetric) {
  const queue = [dur];
  while (queue.length > 0) {
    const floor = queue.shift() || [];
    if (floor.length === 0) return;
    const curFloorLast = floor[floor.length - 1];
    if (curFloorLast.e <= target.s) {
      return floor.push(target);
    }
    let nextFloor: DurationMetric[];
    for (let i = floor.length - 1; i >= 0; i--) {
      const { c } = floor[i];
      if (c) {
        nextFloor = c;
      }
    }
    // @ts-ignore
    if (nextFloor) {
      queue.push(nextFloor);
    } else {
      curFloorLast.c = [target];
    }
  }
}

export function formatterForPlugins(raw: { data: { ext: ITraceEventData } }) {
  const { ext } = raw.data;
  return `
  <div class="loader-tooltip-container">
    <div class="loader-tooltip-title">[${ext.args.p}] ${ext.args.n}</div>
    <li class="loader-tooltip-item">
      <span>hook</span>
      <span>${ext.args.p}</span>
    </li>
    <li class="loader-tooltip-item">
      <span>tap name</span>
      <span>${ext.args.n}</span>
    </li>
    <li class="loader-tooltip-item">
      <span>start</span>
      <span>${dayjs(ext.args.s).format('YYYY/MM/DD HH:mm:ss')}</span>
    </li>
    <li class="loader-tooltip-item">
      <span>end</span>
      <span>${dayjs(ext.args.e).format('YYYY/MM/DD HH:mm:ss')}</span>
    </li>
    <li class="loader-tooltip-item">
      <span>duration</span>
      <span>${formatCosts(ext.args.e - ext.args.s)}</span>
    </li>
  </div>
      `.trim();
}

export function useDebounceHook(
  value: DurationMetric[],
  delay: number,
): DurationMetric[] | undefined {
  const [debounceValue, setDebounceValue] = useState(value);
  useEffect(() => {
    let timer = setTimeout(() => setDebounceValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounceValue;
}
