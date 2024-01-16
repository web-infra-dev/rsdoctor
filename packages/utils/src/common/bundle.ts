import { Client } from '@rsdoctor/types';

const sep = ',';

export function getBundleDiffPageQueryString(files: string[]) {
  let qs = encodeURIComponent(files.join(sep));

  if (qs) {
    qs = `?${Client.RsdoctorClientUrlQuery.BundleDiffFiles}=${qs}`;
  }

  return qs;
}

export function getBundleDiffPageUrl(files: string[]) {
  let qs = getBundleDiffPageQueryString(files);

  if (process.env.NODE_ENV === 'development') {
    if (typeof location !== 'undefined') {
      const { search = '', origin } = location;
      if (search) {
        qs += `&${search.slice(1)}`;
      }
      return `${origin}${qs}#${Client.RsdoctorClientRoutes.BundleDiff}`;
    }
  }

  return `${qs}#${Client.RsdoctorClientRoutes.BundleDiff}`; // TODO: client host check
}

export function parseFilesFromBundlePageUrlQuery(queryValue: string) {
  return decodeURIComponent(queryValue).split(sep);
}
