import { describe, expect, it, rs } from '@rstest/core';
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

  it('responds to request messages on the source websocket client', async () => {
    const sent: string[] = [];
    const socket = new Socket({} as never);
    (socket as any).loader = {
      loadAPIData: rs.fn().mockResolvedValue([{ id: 1 }]),
    };

    const client = {
      readyState: 1,
      send(message: string) {
        sent.push(message);
      },
      on() {},
    } as never;
    socket.attachClient(client);

    await socket.handleClientMessage(
      JSON.stringify({
        type: 'request',
        id: 'request-1',
        api: SDK.ServerAPI.API.GetAllModuleGraph,
        body: {},
      }),
      client,
    );

    expect(sent).toStrictEqual([
      JSON.stringify({
        type: 'response',
        id: 'request-1',
        payload: [{ id: 1 }],
      }),
    ]);
  });
});
