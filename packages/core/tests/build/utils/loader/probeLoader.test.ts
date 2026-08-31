import { afterEach, describe, expect, it, rs } from 'rstack/test';
import type { Plugin, SDK } from '@rsdoctor/shared/types';
import probeLoader, {
  type ProbeLoaderOptions,
} from '@/build-utils/build/loader/probeLoader';
import { setSDK } from '@/inner-plugins/utils/sdk';

afterEach(() => {
  delete globalThis.__rsdoctor_sdk__;
  delete globalThis.__rsdoctor_sdks__;
});

describe('probe loader', () => {
  it('reports loader data to the matching SDK', () => {
    const reportLoaderStartOrEnd = rs.fn();
    const callback = rs.fn();
    setSDK({
      name: 'web',
      reportLoaderStartOrEnd,
    } as unknown as SDK.RsdoctorBuilderSDKInstance);

    const createContext = (
      type: ProbeLoaderOptions['type'],
      loaderIndex: number,
    ) =>
      ({
        _module: { layer: 'modern' },
        callback,
        getOptions: () => ({
          builderName: 'web',
          loader: 'builtin:swc-loader',
          options: { jsc: true },
          type,
        }),
        loaderIndex,
        resourcePath: '/project/src/index.ts',
        resourceQuery: '?raw',
      }) as unknown as Plugin.LoaderContext<ProbeLoaderOptions>;

    probeLoader.call(createContext('start', 2), 'source');

    expect(reportLoaderStartOrEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: {
          ext: 'ts',
          layer: 'modern',
          path: '/project/src/index.ts[modern]',
          query: { raw: '' },
          queryRaw: '?raw',
        },
        loaders: [
          expect.objectContaining({
            input: 'source',
            loader: 'builtin:swc-loader',
            loaderIndex: 1,
            options: { jsc: true },
            result: null,
          }),
        ],
      }),
    );
    expect(callback).toHaveBeenCalledWith(null, 'source');

    reportLoaderStartOrEnd.mockClear();
    callback.mockClear();
    probeLoader.call(createContext('end', 0), 'result');

    expect(reportLoaderStartOrEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        loaders: [
          expect.objectContaining({
            input: null,
            loaderIndex: 1,
            result: 'result',
          }),
        ],
      }),
    );
    expect(callback).toHaveBeenCalledWith(null, 'result');
  });
});
