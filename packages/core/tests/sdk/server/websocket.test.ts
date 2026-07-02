import { describe, expect, it, rs } from '@rstest/core';
import { SDK } from '@rsdoctor/shared/types';
import { Socket } from '../../../src/sdk/server/socket';

function createMockClient() {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();
  const sent: string[] = [];
  const client = {
    readyState: 1,
    sent,
    send(message: string) {
      sent.push(message);
    },
    on(event: string, listener: (...args: any[]) => void) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(listener);
    },
    emit(event: string, ...args: any[]) {
      listeners.get(event)?.forEach((listener) => listener(...args));
    },
  };
  return client;
}

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
    const socket = new Socket({} as never);
    (socket as any).loader = {
      loadAPIData: rs.fn().mockResolvedValue([{ id: 1 }]),
    };

    const client = createMockClient();
    socket.attachClient(client as never);

    await socket.handleClientMessage(
      JSON.stringify({
        type: 'request',
        id: 'request-1',
        api: SDK.ServerAPI.API.GetAllModuleGraph,
        body: {},
      }),
      client,
    );

    expect(client.sent).toStrictEqual([
      JSON.stringify({
        type: 'response',
        id: 'request-1',
        payload: [{ id: 1 }],
      }),
    ]);
  });

  it('removes subscriptions received from clients', async () => {
    const socket = new Socket({} as never);
    const client = createMockClient();
    socket.attachClient(client as never);

    await socket.handleClientMessage(
      JSON.stringify({
        type: 'subscribe',
        api: SDK.ServerAPI.API.GetChunkGraph,
        body: { page: 1 },
      }),
      client as never,
    );
    await socket.handleClientMessage(
      JSON.stringify({
        type: 'unsubscribe',
        api: SDK.ServerAPI.API.GetChunkGraph,
        body: { page: 1 },
      }),
      client as never,
    );

    expect(socket.getSubscriptions()).toStrictEqual([]);
  });

  it('removes client subscriptions when the websocket closes', async () => {
    const socket = new Socket({} as never);
    const firstClient = createMockClient();
    const secondClient = createMockClient();
    socket.attachClient(firstClient as never);
    socket.attachClient(secondClient as never);

    const message = JSON.stringify({
      type: 'subscribe',
      api: SDK.ServerAPI.API.GetChunkGraph,
      body: { page: 1 },
    });
    await socket.handleClientMessage(message, firstClient as never);
    await socket.handleClientMessage(message, secondClient as never);

    firstClient.emit('close');
    expect(socket.getSubscriptions()).toStrictEqual([
      {
        api: SDK.ServerAPI.API.GetChunkGraph,
        body: { page: 1 },
      },
    ]);

    secondClient.emit('close');
    expect(socket.getSubscriptions()).toStrictEqual([]);
  });
});
