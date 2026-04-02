import { Fetch } from '@rsdoctor/utils/common';

/** Thin wrapper so tests can `rs.mock('./fetch-http')` without depending on `Fetch.getFetch` internals. */
export function fetchWithTimeout(
  url: string,
  options: Parameters<typeof Fetch.fetchWithTimeout>[1],
) {
  return Fetch.fetchWithTimeout(url, options);
}
