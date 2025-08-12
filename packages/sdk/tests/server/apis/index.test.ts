import { describe, expect, it } from '@rstest/core';
import { SDK } from '@rsdoctor/types';
import { Router } from '../../../src/sdk/server/router';

// make sure the decorators work.
import '../../../src/sdk/server/apis';

describe('ensure all of the apis implementation for server', () => {
  const apis = Object.values(SDK.ServerAPI.API);

  it(`ensure server`, async () => {
    const { get, post } = Router.routes;

    const list = [...get, ...post].map((e) => e[1].map((el) => el[1])).flat();

    list.forEach((api) => {
      expect(apis).toContain(api);
    });

    expect(list.length).toBeGreaterThanOrEqual(30);
  });
});
