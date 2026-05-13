import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { SDK } from '@rsdoctor/types';
import { publishServerSocketMessage, subscribeServerAPI } from './socket';

describe('websocket transport', () => {
  afterEach(() => {
    rs.restoreAllMocks();
  });

  it('dispatches server push payloads to subscribers by api', () => {
    const callback = rs.fn();
    const api = SDK.ServerAPI.APIExtends.GetCompileProgress;
    const unsubscribe = subscribeServerAPI(api, null, callback);

    publishServerSocketMessage({
      api,
      payload: {
        req: { api, body: undefined },
        res: { percentage: 50, message: 'building' },
      },
    });

    expect(callback).toHaveBeenCalledWith({
      req: { api, body: undefined },
      res: { percentage: 50, message: 'building' },
    });

    unsubscribe();
  });
});
