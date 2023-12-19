import { Loader } from '@rsdoctor/utils/common';
import { SDK } from '@rsdoctor/types';
import dayjs from 'dayjs';
import { maxBy, minBy } from 'lodash-es';
import { formatCosts } from 'src/utils';

import './tooltips.scss';

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
    <li class="loader-tooltip-item">
      <span>duration</span>
      <span class="loader-tooltip-textbold">${formatCosts(loader.costs)}</span>
    </li>
    <li class="loader-tooltip-item">
      <span>filepath</span>
      <span>${loader.resource}</span>
    </li>
    <li class="loader-tooltip-item">
      <span>start</span>
      <span class="loader-tooltip-textbold">${dayjs(loader.startAt).format('YYYY/MM/DD HH:mm:ss')}</span>
    </li>
    <li class="loader-tooltip-item">
      <span>end</span>
      <span class="loader-tooltip-textbold">${dayjs(loader.endAt).format('YYYY/MM/DD HH:mm:ss')}</span>
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
  const nodeModulesResources = resources.filter((e) => e.includes('/node_modules/'));
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
    <span class="loader-tooltip-textbold">${resources.length}</span>
  </li>
  <li class="loader-tooltip-item">
    <span>files(node_modules)</span>
    <span class="loader-tooltip-textbold">${nodeModulesResources.length}</span>
  </li>
  <li class="loader-tooltip-item">
    <span>files(outside the cwd)</span>
    <span class="loader-tooltip-textbold">${outsideResources.length}</span>
  </li>
  <li class="loader-tooltip-item">
    <span>duration(estimated)</span>
    <span class="loader-tooltip-textbold">${formatCosts(duration)}</span>
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

export function replaceSlashWithNewline(input: string) {
  let result = '';
  for(let i = 0; i < input.length; i++) {
    if(input[i] === '/') {
      if(true) {
        result += '/\n';
      } else {
        result += '/';
      }
    } else {
      result += input[i];
    }
  }
  return result;
}