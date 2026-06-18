import { describe, expect, it } from '@rstest/core';
import { SDK } from '@rsdoctor/types';
import { Router } from '../../../src/sdk/server/router';
import * as APIs from '../../../src/sdk/server/apis';

describe('ensure all of the apis implementation for server', () => {
  const apis = Object.values(SDK.ServerAPI.API);

  Object.values(APIs).forEach((API) => {
    if (typeof API === 'function') {
      new API({} as never, {} as never);
    }
  });

  it(`ensure server`, async () => {
    const { get, post } = Router.routes;

    const list = [...get, ...post].map((e) => e[1].map((el) => el[1])).flat();

    list.forEach((api) => {
      expect(apis).toContain(api);
    });

    expect(list.length).toBeGreaterThanOrEqual(30);
  });

  it('ensure bundle diff APIs are registered', async () => {
    const { get, post } = Router.routes;
    const getRoutes = [...get.values()].flat().map((el) => el[1]);
    const postRoutes = [...post.values()].flat().map((el) => el[1]);

    expect(getRoutes).toContain(SDK.ServerAPI.API.BundleDiffManifest);
    expect(postRoutes).toContain(SDK.ServerAPI.API.GetBundleDiffSummary);
  });
});
