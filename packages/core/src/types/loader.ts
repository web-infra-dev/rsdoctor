import { Loader } from '@rsdoctor/shared/common-browser';

export interface ProxyLoaderInternalOptions {
  /**
   * A session marker registered as a loader build dependency so persistent
   * caches are invalidated when a new Rsdoctor session starts.
   */
  cacheMarkerPath?: string;
  cwd: string;
  /**
   * the url host of http server(which used to collect data).
   */
  host: string;
  /**
   * correct loader path.
   */
  loader: string;
  /** include the loader option */
  hasOptions: boolean;
  skipLoaders: string[];
}

export interface ProxyLoaderOptions {
  [key: string]: any;
  [Loader.LoaderInternalPropertyName]: ProxyLoaderInternalOptions;
}
