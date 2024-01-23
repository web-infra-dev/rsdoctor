import { Loader } from '@rsdoctor/utils/common';
import { SDK } from '@rsdoctor/types';
import { flatten, includes } from 'lodash-es';

const { findLoaderTotalTiming, getLoaderCosts } = Loader;
export { findLoaderTotalTiming, getLoaderCosts };

export function flattenLoaderData(loaderData: SDK.LoaderData) {
  return flatten(loaderData.map((e) => e.loaders));
}

export function filterLoaders(
  loaderData: SDK.ResourceLoaderData,
  keyword: string,
  loaderNames: string[],
) {
  return loaderData.loaders.filter((item) => {
    return filterLoader(
      loaderData.resource.path,
      item.loader,
      keyword,
      loaderNames,
    );
  });
}

export function filterLoader(
  resourcePath: string,
  loader: string,
  keyword: string,
  loaderNames: string[],
) {
  if (keyword) {
    if (resourcePath.indexOf(keyword) === -1) return false;
  }

  if (loaderNames?.length) {
    if (!includes(loaderNames, loader)) return false;
  }

  return true;
}
