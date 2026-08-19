import { afterEach, describe, expect, it } from '@rstest/core';
import type { SDK } from '@rsdoctor/shared/types';
import { createSDK, type MockSDKResponse } from '../../utils';

function createLoaderEvent({
  type,
  time,
  loaderIndex = 0,
}: {
  type: 'start' | 'end';
  time: number;
  loaderIndex?: number;
}): SDK.ResourceLoaderData {
  return {
    resource: {
      path: '/src/index.ts',
      query: {},
      queryRaw: '',
      ext: 'ts',
    },
    loaders: [
      {
        loader: 'builtin:swc-loader',
        loaderIndex,
        path: 'builtin:swc-loader',
        input: type === 'start' ? `input-${time}` : null,
        result: type === 'end' ? `result-${time}` : null,
        startAt: type === 'start' ? time : 0,
        endAt: type === 'end' ? time : 0,
        options: {},
        isPitch: false,
        sync: false,
        errors: [],
        pid: process.pid,
        ppid: process.ppid,
      },
    ],
  };
}

describe('loader event lifecycle', () => {
  let target: MockSDKResponse;

  afterEach(async () => {
    if (target) await target.dispose();
  });

  it('records one loader transform per rebuild', async () => {
    target = await createSDK({ noServer: true });

    target.sdk.reportLoaderStartOrEnd(
      createLoaderEvent({ type: 'start', time: 100 }),
    );
    target.sdk.reportLoaderStartOrEnd(
      createLoaderEvent({ type: 'end', time: 110 }),
    );
    target.sdk.reportLoaderStartOrEnd(
      createLoaderEvent({ type: 'start', time: 200 }),
    );
    target.sdk.reportLoaderStartOrEnd(
      createLoaderEvent({ type: 'end', time: 210 }),
    );

    const [resource] = target.sdk.getStoreData().loader;

    expect(resource.loaders).toHaveLength(2);
    expect(resource.loaders).toMatchObject([
      { startAt: 100, endAt: 110, result: 'result-110' },
      { startAt: 200, endAt: 210, result: 'result-210' },
    ]);
  });

  it('matches repeated loader paths by loader index', async () => {
    target = await createSDK({ noServer: true });

    target.sdk.reportLoaderStartOrEnd(
      createLoaderEvent({ type: 'start', time: 100, loaderIndex: 0 }),
    );
    target.sdk.reportLoaderStartOrEnd(
      createLoaderEvent({ type: 'start', time: 101, loaderIndex: 1 }),
    );
    target.sdk.reportLoaderStartOrEnd(
      createLoaderEvent({ type: 'end', time: 111, loaderIndex: 1 }),
    );
    target.sdk.reportLoaderStartOrEnd(
      createLoaderEvent({ type: 'end', time: 120, loaderIndex: 0 }),
    );

    const [resource] = target.sdk.getStoreData().loader;

    expect(resource.loaders).toMatchObject([
      { loaderIndex: 0, startAt: 100, endAt: 120 },
      { loaderIndex: 1, startAt: 101, endAt: 111 },
    ]);
  });
});
