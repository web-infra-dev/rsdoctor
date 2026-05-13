/* rslint-disable no-restricted-globals */
import type { Common, SDK } from '@rsdoctor/types';

type SocketAPI = SDK.ServerAPI.API | SDK.ServerAPI.APIExtends;

export interface ServerSocketMessage<T extends SocketAPI = SocketAPI> {
  api: T;
  payload: SDK.ServerAPI.SocketResponseType<T>;
}

type SocketListener<T extends SocketAPI = SocketAPI> = (
  payload: SDK.ServerAPI.SocketResponseType<T>,
) => void;

type Subscription = {
  api: SocketAPI;
  body: Common.PlainObject | null | undefined;
};

type SocketClient = {
  url: string;
  socket?: WebSocket;
  listeners: Map<SocketAPI, Set<SocketListener>>;
  subscriptions: Map<string, Subscription>;
};

const clients = new Map<string, SocketClient>();
const defaultClientKey = '__default__';
const openState = 1;

const ipv4Pattern =
  /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

function getSocketProtocol(protocol: string) {
  return protocol.includes('https') ? 'wss' : 'ws';
}

function getDefaultSocketUrl() {
  if (typeof location === 'undefined') {
    return '';
  }

  const socketProtocol = getSocketProtocol(location.protocol);
  return process.env.NODE_ENV === 'development'
    ? `${socketProtocol}://${location.hostname}:${process.env.LOCAL_CLI_PORT}`
    : `${socketProtocol}://${location.host}`;
}

function getSocketUrl(socketPort?: string) {
  if (typeof location === 'undefined') {
    return socketPort ? `ws://localhost:${socketPort}` : '';
  }

  return socketPort
    ? formatURL({
        port: socketPort,
        hostname: location.hostname,
        protocol: location.protocol,
      })
    : getDefaultSocketUrl();
}

function getClient(socketUrl = getDefaultSocketUrl()) {
  const key = socketUrl || defaultClientKey;
  if (!clients.has(key)) {
    clients.set(key, {
      url: socketUrl,
      listeners: new Map(),
      subscriptions: new Map(),
    });
  }
  return clients.get(key)!;
}

function getSubscriptionKey(api: SocketAPI, body: Subscription['body']) {
  return `${api}:${JSON.stringify(body ?? null)}`;
}

function sendSubscription(client: SocketClient, subscription: Subscription) {
  if (client.socket?.readyState !== openState) {
    return;
  }

  client.socket.send(
    JSON.stringify({
      type: 'subscribe',
      api: subscription.api,
      body: subscription.body ?? null,
    }),
  );
}

function connectSocket(client: SocketClient) {
  if (!client.url || typeof WebSocket === 'undefined' || client.socket) {
    return;
  }

  const socket = new WebSocket(client.url);
  socket.addEventListener('open', () => {
    client.subscriptions.forEach((subscription) => {
      sendSubscription(client, subscription);
    });
  });
  socket.addEventListener('message', (event) => {
    if (typeof event.data !== 'string') {
      return;
    }

    try {
      publishServerSocketMessage(
        JSON.parse(event.data) as ServerSocketMessage,
        client.url,
      );
    } catch {
      // Ignore malformed payloads and keep the transport alive.
    }
  });
  socket.addEventListener('close', () => {
    client.socket = undefined;
  });
  client.socket = socket;
}

export function subscribeServerAPI<T extends SocketAPI>(
  api: T,
  body: SDK.ServerAPI.InferRequestBodyType<T, null> | null,
  listener: SocketListener<T>,
  socketPort?: string,
) {
  const client = getClient(getSocketUrl(socketPort));
  if (!client.listeners.has(api)) {
    client.listeners.set(api, new Set());
  }
  client.listeners.get(api)!.add(listener as SocketListener);

  const subscription = {
    api,
    body: body ?? null,
  };
  client.subscriptions.set(getSubscriptionKey(api, body), subscription);
  connectSocket(client);
  sendSubscription(client, subscription);

  return () => {
    client.listeners.get(api)?.delete(listener as SocketListener);
  };
}

export function unsubscribeServerAPI<T extends SocketAPI>(
  api: T,
  listener: SocketListener<T>,
  socketPort?: string,
) {
  const client = getClient(getSocketUrl(socketPort));
  client.listeners.get(api)?.delete(listener as SocketListener);
}

export function publishServerSocketMessage(
  message: ServerSocketMessage,
  socketUrl?: string,
) {
  const targets = socketUrl ? [getClient(socketUrl)] : [...clients.values()];

  targets.forEach((client) => {
    client.listeners.get(message.api)?.forEach((listener) => {
      listener(message.payload);
    });
  });
}

export function formatURL({
  port,
  protocol,
  hostname,
}: {
  port?: string;
  protocol: string;
  hostname: string;
}) {
  if (typeof URL !== 'undefined') {
    const url = new URL('http://localhost');
    url.port = String(port);
    url.hostname = hostname;
    url.protocol = getSocketProtocol(protocol);
    return ipv4Pattern.test(hostname) || hostname.includes('localhost')
      ? url.toString()
      : `${protocol}//${hostname}`;
  }

  const colon = protocol.indexOf(':') === -1 ? ':' : '';
  return `${protocol}${colon}//${hostname}:${port}`;
}
