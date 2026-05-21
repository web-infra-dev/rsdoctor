import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { SDK } from '@rsdoctor/types';
import { LocalServerDataLoader } from './local';

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

describe('LocalServerDataLoader', () => {
  const originalFetch = globalThis.fetch;
  const originalWebSocket = globalThis.WebSocket;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    globalThis.WebSocket = originalWebSocket;
    MockWebSocket.instances = [];
    rs.restoreAllMocks();
  });

  it('disposes subscriptions when request body strings contain delimiters', () => {
    const loader = new LocalServerDataLoader({
      data: {},
    } as any);

    loader.onDataUpdate(
      SDK.ServerAPI.API.GetModuleByName,
      { name: 'foo::bar' } as any,
      rs.fn(),
    );

    expect(() => loader.dispose()).not.toThrow();
  });

  it('loads APIs through websocket requests', async () => {
    globalThis.WebSocket = MockWebSocket as any;
    const fetchMock = rs.fn();
    globalThis.fetch = fetchMock as typeof fetch;
    const loader = new LocalServerDataLoader({
      data: {},
      __SOCKET__PORT__: '3083',
    } as any);

    const task = loader.loadAPI(SDK.ServerAPI.API.GetAllModuleGraph, {} as any);
    const socket = MockWebSocket.instances[0];
    socket.trigger('open');
    const request = JSON.parse(socket.sentMessages[0]);

    socket.trigger(
      'message',
      JSON.stringify({
        type: 'response',
        id: request.id,
        payload: [{ id: 1 }],
      }),
    );

    await expect(task).resolves.toStrictEqual([{ id: 1 }]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
