import { Loader } from '@rsdoctor/utils/common';
import { SDK } from '@rsdoctor/types';

const { findLoaderTotalTiming, getLoaderCosts } = Loader;
export { findLoaderTotalTiming, getLoaderCosts };

export function flattenLoaderData(loaderData: SDK.LoaderData) {
  return loaderData.flatMap((e) => e.loaders);
}

export function filterLoaders(
  loaderData: SDK.ResourceLoaderData,
  keyword: string,
  loaderNames: string[],
  layer?: string,
) {
  return loaderData.loaders.filter((item) => {
    return filterLoader(
      loaderData.resource.path,
      item.loader,
      keyword,
      loaderNames,
      loaderData.resource.layer,
      layer,
    );
  });
}

export function filterLoader(
  resourcePath: string,
  loader: string,
  keyword: string,
  loaderNames: string[],
  resorceLayer?: string,
  layer?: string,
) {
  if (keyword) {
    if (resourcePath.indexOf(keyword) === -1) return false;
  }

  if (resorceLayer && layer && resorceLayer !== layer) {
    return false;
  }

  if (loaderNames?.length) {
    if (!loaderNames.includes(loader)) return false;
  }

  return true;
}
