/* rslint-disable no-restricted-globals */
import type { Common, SDK } from '@rsdoctor/types';

type SocketAPI = SDK.ServerAPI.API | SDK.ServerAPI.APIExtends;

export interface ServerSocketMessage<T extends SocketAPI = SocketAPI> {
  api: T;
  payload: SDK.ServerAPI.SocketResponseType<T>;
}

type ServerSocketResponseMessage<
  T extends SDK.ServerAPI.API = SDK.ServerAPI.API,
> = {
  type: 'response';
  id: string;
  payload?: SDK.ServerAPI.InferResponseType<T>;
  error?: string;
};

type SocketListener<T extends SocketAPI = SocketAPI> = (
  payload: SDK.ServerAPI.SocketResponseType<T>,
) => void;

type Subscription = {
  api: SocketAPI;
  body: Common.PlainObject | null | undefined;
};

type PendingRequest = {
  message: string;
  resolve: (payload: unknown) => void;
  reject: (error: Error) => void;
};

type SocketClient = {
  url: string;
  socket?: WebSocket;
  listeners: Map<string, Set<SocketListener>>;
  subscriptions: Map<string, Subscription>;
  requests: Map<string, PendingRequest>;
};

const clients = new Map<string, SocketClient>();
const defaultClientKey = '__default__';
const openState = 1;
let requestId = 0;

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
  if (socketPort?.startsWith('ws://') || socketPort?.startsWith('wss://')) {
    return socketPort;
  }

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
      requests: new Map(),
    });
  }
  return clients.get(key)!;
}

function getSubscriptionKey(api: SocketAPI, body: unknown) {
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

function sendUnsubscribe(client: SocketClient, subscription: Subscription) {
  if (client.socket?.readyState !== openState) {
    return;
  }

  client.socket.send(
    JSON.stringify({
      type: 'unsubscribe',
      api: subscription.api,
      body: subscription.body ?? null,
    }),
  );
}

function sendRequest(client: SocketClient, id: string) {
  if (client.socket?.readyState !== openState) {
    return;
  }

  const request = client.requests.get(id);
  if (!request) {
    return;
  }
  client.socket.send(request.message);
}

function handleResponseMessage(
  client: SocketClient,
  message: ServerSocketResponseMessage,
) {
  const request = client.requests.get(message.id);
  if (!request) {
    return;
  }

  client.requests.delete(message.id);
  if (message.error) {
    request.reject(new Error(message.error));
    return;
  }
  request.resolve(message.payload);
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
    client.requests.forEach((_, id) => {
      sendRequest(client, id);
    });
  });
  socket.addEventListener('message', (event) => {
    if (typeof event.data !== 'string') {
      return;
    }

    try {
      const message = JSON.parse(event.data) as
        | ServerSocketMessage
        | ServerSocketResponseMessage;
      if ('type' in message && message.type === 'response') {
        handleResponseMessage(client, message);
        return;
      }
      publishServerSocketMessage(message as ServerSocketMessage, client.url);
    } catch {
      // Ignore malformed payloads and keep the transport alive.
    }
  });
  socket.addEventListener('close', () => {
    client.socket = undefined;
    client.requests.forEach((request) => {
      request.reject(
        new Error('WebSocket closed before the response arrived.'),
      );
    });
    client.requests.clear();
  });
  client.socket = socket;
}

export function requestServerAPI<
  T extends SDK.ServerAPI.API,
  B extends SDK.ServerAPI.InferRequestBodyType<T> =
    SDK.ServerAPI.InferRequestBodyType<T>,
  R extends SDK.ServerAPI.InferResponseType<T> =
    SDK.ServerAPI.InferResponseType<T>,
>(api: T, body: B | null | undefined, socketPort?: string): Promise<R> {
  const socketUrl = getSocketUrl(socketPort);
  if (!socketUrl) {
    return Promise.reject(new Error('WebSocket URL is not available.'));
  }

  if (typeof WebSocket === 'undefined') {
    return Promise.reject(new Error('WebSocket is not available.'));
  }

  const client = getClient(socketUrl);
  const id = `${Date.now()}-${++requestId}`;

  return new Promise<R>((resolve, reject) => {
    client.requests.set(id, {
      message: JSON.stringify({
        type: 'request',
        id,
        api,
        body: body ?? null,
      }),
      resolve: resolve as (payload: unknown) => void,
      reject,
    });
    connectSocket(client);
    sendRequest(client, id);
  });
}

export function subscribeServerAPI<T extends SocketAPI>(
  api: T,
  body: SDK.ServerAPI.InferRequestBodyType<T, null> | null,
  listener: SocketListener<T>,
  socketPort?: string,
) {
  const client = getClient(getSocketUrl(socketPort));
  const bodyValue = body ?? null;
  const key = getSubscriptionKey(api, bodyValue);
  if (!client.listeners.has(key)) {
    client.listeners.set(key, new Set());
  }
  client.listeners.get(key)!.add(listener as SocketListener);

  const subscription = {
    api,
    body: bodyValue,
  };
  client.subscriptions.set(key, subscription);
  connectSocket(client);
  sendSubscription(client, subscription);

  return () => {
    unsubscribeServerAPI(api, bodyValue, listener, socketPort);
  };
}

export function unsubscribeServerAPI<T extends SocketAPI>(
  api: T,
  body: SDK.ServerAPI.InferRequestBodyType<T, null> | null,
  listener: SocketListener<T>,
  socketPort?: string,
) {
  const client = getClient(getSocketUrl(socketPort));
  const key = getSubscriptionKey(api, body);
  const listeners = client.listeners.get(key);
  listeners?.delete(listener as SocketListener);

  if (listeners?.size === 0) {
    const subscription = client.subscriptions.get(key);
    if (subscription) {
      sendUnsubscribe(client, subscription);
    }
    client.listeners.delete(key);
    client.subscriptions.delete(key);
  }
}

export function publishServerSocketMessage(
  message: ServerSocketMessage,
  socketUrl?: string,
) {
  const targets = socketUrl ? [getClient(socketUrl)] : [...clients.values()];

  targets.forEach((client) => {
    const key = getSubscriptionKey(message.api, message.payload.req.body);
    client.listeners.get(key)?.forEach((listener) => {
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
  const socketProtocol = getSocketProtocol(protocol);
  const shouldUsePort =
    ipv4Pattern.test(hostname) || hostname.includes('localhost');

  if (typeof URL !== 'undefined') {
    const url = new URL('http://localhost');
    url.hostname = hostname;
    url.protocol = socketProtocol;
    if (port && shouldUsePort) {
      url.port = port;
    }
    return url.toString();
  }

  const portText = port && shouldUsePort ? `:${port}` : '';
  return `${socketProtocol}://${hostname}${portText}`;
}
