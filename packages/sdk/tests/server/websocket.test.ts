import { describe, expect, it } from '@rstest/core';
import { SDK } from '@rsdoctor/types';
import { Socket } from '../../src/sdk/server/socket';

describe('server websocket transport', () => {
  it('stores subscriptions received from clients', () => {
    const socket = new Socket({} as never);

    socket.handleClientMessage(
      JSON.stringify({
        type: 'subscribe',
        api: SDK.ServerAPI.API.GetChunkGraph,
        body: { page: 1 },
      }),
    );

    expect(socket.getSubscriptions()).toStrictEqual([
      {
        api: SDK.ServerAPI.API.GetChunkGraph,
        body: { page: 1 },
      },
    ]);
  });

  it('serializes push messages for websocket clients', () => {
    const sent: string[] = [];
    const socket = new Socket({} as never);

    socket.attachClient({
      readyState: 1,
      send(message: string) {
        sent.push(message);
      },
    } as never);

    socket.sendAPIData(SDK.ServerAPI.APIExtends.GetCompileProgress, {
      req: {
        api: SDK.ServerAPI.APIExtends.GetCompileProgress,
        body: undefined,
      },
      res: { percentage: 50, message: 'building' },
    });

    expect(sent).toStrictEqual([
      JSON.stringify({
        api: SDK.ServerAPI.APIExtends.GetCompileProgress,
        payload: {
          req: {
            api: SDK.ServerAPI.APIExtends.GetCompileProgress,
          },
          res: { percentage: 50, message: 'building' },
        },
      }),
    ]);
  });
});
