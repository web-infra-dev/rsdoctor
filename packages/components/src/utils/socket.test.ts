import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { SDK } from '@rsdoctor/types';
import {
  formatURL,
  publishServerSocketMessage,
  requestServerAPI,
  subscribeServerAPI,
} from './socket';

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  public readyState = 0;

  public sentMessages: string[] = [];

  private listeners = new Map<
    string,
    Set<(event?: { data: string }) => void>
  >();

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  addEventListener(
    event: string,
    listener: (event?: { data: string }) => void,
  ) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  send(message: string) {
    this.sentMessages.push(message);
  }

  trigger(event: string, data?: string) {
    if (event === 'open') {
      this.readyState = 1;
    }
    this.listeners
      .get(event)
      ?.forEach((listener) =>
        listener(data === undefined ? undefined : { data }),
      );
  }
}

describe('websocket transport', () => {
  const originalWebSocket = globalThis.WebSocket;

  afterEach(() => {
    rs.restoreAllMocks();
    globalThis.WebSocket = originalWebSocket;
    MockWebSocket.instances = [];
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

  it('formats non-localhost socket urls with websocket protocol', () => {
    expect(
      formatURL({
        port: '3000',
        protocol: 'https:',
        hostname: 'example.com',
      }),
    ).toBe('wss://example.com/');
  });

  it('removes subscriptions when the last listener unsubscribes', () => {
    globalThis.WebSocket = MockWebSocket as any;

    const api = SDK.ServerAPI.API.GetModuleByName;
    const body = { name: 'foo' };
    const unsubscribe = subscribeServerAPI(api, body as any, rs.fn(), '3081');
    const staleSocket = MockWebSocket.instances[0];

    unsubscribe();
    staleSocket.trigger('close');

    subscribeServerAPI(SDK.ServerAPI.API.GetProjectInfo, null, rs.fn(), '3081');
    const reconnectedSocket = MockWebSocket.instances[1];
    reconnectedSocket.trigger('open');

    expect(
      reconnectedSocket.sentMessages.map((message) => JSON.parse(message)),
    ).toStrictEqual([
      {
        type: 'subscribe',
        api: SDK.ServerAPI.API.GetProjectInfo,
        body: null,
      },
    ]);
  });

  it('resolves request responses sent over websocket', async () => {
    globalThis.WebSocket = MockWebSocket as any;

    const request = requestServerAPI(
      SDK.ServerAPI.API.GetAllModuleGraph,
      {},
      '3082',
    );
    const socket = MockWebSocket.instances[0];
    socket.trigger('open');
    const [message] = socket.sentMessages.map((item) => JSON.parse(item));

    expect(message).toMatchObject({
      type: 'request',
      api: SDK.ServerAPI.API.GetAllModuleGraph,
      body: {},
    });
    expect(message.id).toBeTruthy();

    socket.trigger(
      'message',
      JSON.stringify({
        type: 'response',
        id: message.id,
        payload: [{ id: 1 }],
      }),
    );

    await expect(request).resolves.toStrictEqual([{ id: 1 }]);
  });
});
