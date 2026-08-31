import path from 'node:path';
import { afterEach, describe, expect, it, rs } from 'rstack/test';
import { Loader } from '@rsdoctor/shared/common-browser';
import type { Plugin, SDK } from '@rsdoctor/shared/types';
import proxyLoader, { pitch } from '@/inner-plugins/loaders/proxy';
import { setSDK } from '@/inner-plugins/utils/sdk';
import type { ProxyLoaderOptions } from '@/types';

afterEach(() => {
  delete globalThis.__rsdoctor_sdk__;
  delete globalThis.__rsdoctor_sdks__;
});

describe('proxy loader cacheability', () => {
  it('preserves caching and registers the session marker', () => {
    setSDK({
      name: 'web',
      reportLoader: rs.fn(),
      reportSourceMap: rs.fn(),
    } as unknown as SDK.RsdoctorBuilderSDKInstance);

    const loaderDirectory = path.resolve(__dirname, '../fixtures/loaders');
    const cacheMarkerPath = path.join(loaderDirectory, '.loader-cache');
    const addBuildDependency = rs.fn();
    const cacheable = rs.fn();
    const createContext = (
      loader: string,
    ): Plugin.LoaderContext<ProxyLoaderOptions> =>
      ({
        _compilation: { name: 'web' },
        _module: {},
        addBuildDependency,
        cacheable,
        callback: rs.fn(),
        getOptions: () => ({
          [Loader.LoaderInternalPropertyName]: {
            cacheMarkerPath,
            cwd: loaderDirectory,
            hasOptions: false,
            host: 'http://localhost:3000',
            loader,
            skipLoaders: [],
          },
        }),
        loaderIndex: 0,
        resourcePath: '/project/src/index.js',
        resourceQuery: '',
      }) as unknown as Plugin.LoaderContext<ProxyLoaderOptions>;

    const normalResult = proxyLoader.call(
      createContext(path.join(loaderDirectory, 'basic-loader.cjs')),
      Buffer.from('source'),
    );
    const pitchResult = pitch.call(
      createContext(path.join(loaderDirectory, 'pitch-loader-esm.js')),
    );

    expect(normalResult).toBe('source');
    expect(pitchResult).toBe('pitch');
    expect(addBuildDependency).toHaveBeenCalledTimes(2);
    expect(addBuildDependency).toHaveBeenCalledWith(cacheMarkerPath);
    expect(cacheable).not.toHaveBeenCalled();
  });
});
