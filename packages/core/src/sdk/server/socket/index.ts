import { Common, SDK } from '@rsdoctor/shared/types';
import type { Server } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import type { VerifyClientCallbackSync } from 'ws';
import { SocketAPILoader } from './api';
import { isAllowedRequestHost } from '../security';

interface SocketOptions {
  sdk: SDK.RsdoctorBuilderSDKInstance;
  server: Server;
  port: number;
  token: string;
}

type Subscription = {
  api: SDK.ServerAPI.API;
  body: Common.PlainObject | null;
};

type SubscriptionRecord = Subscription & {
  count: number;
};

type ClientMessage = {
  type?: string;
  id?: string;
  api?: SDK.ServerAPI.API;
  body?: Common.PlainObject | null;
};

function isAllowedSocketToken(url: string | undefined, token: string) {
  if (!url) {
    return false;
  }

  return new URL(url, 'http://localhost').searchParams.get('token') === token;
}

export class Socket {
  protected server?: WebSocketServer;

  protected clients = new Set<WebSocket>();

  protected loader: SocketAPILoader;

  protected map: Map<string, SubscriptionRecord> = new Map();

  protected clientSubscriptions: Map<WebSocket, Set<string>> = new Map();

  constructor(protected options: SocketOptions) {
    this.loader = new SocketAPILoader({ sdk: options.sdk });
  }

  public bootstrap() {
    this.server = new WebSocketServer({
      server: this.options.server,
      verifyClient: (({ req }) => {
        const host = req.headers.host || req.headers[':authority'];
        return (
          isAllowedRequestHost(host) &&
          isAllowedSocketToken(req.url, this.options.token)
        );
      }) satisfies VerifyClientCallbackSync,
    });
    this.server.on('connection', (client) => {
      this.attachClient(client);
    });
  }

  public attachClient(client: WebSocket) {
    this.clients.add(client);

    if (typeof client.on === 'function') {
      client.on('message', (message) => {
        this.handleClientMessage(message.toString(), client);
      });
      client.on('close', () => {
        this.clients.delete(client);
        this.removeClientSubscriptions(client);
      });
    }
  }

  public async handleClientMessage(raw: string, client?: WebSocket) {
    let message: ClientMessage;
    try {
      message = JSON.parse(raw) as ClientMessage;
    } catch {
      return;
    }

    if (
      !message.api ||
      !Object.values(SDK.ServerAPI.API).includes(message.api)
    ) {
      return;
    }

    if (message.type === 'request') {
      await this.handleAPIRequestMessage(message, client);
      return;
    }

    if (message.type === 'subscribe') {
      this.saveRequestToMap(message.api, message.body ?? null, client);
      return;
    }

    if (message.type === 'unsubscribe') {
      this.removeRequestFromMap(message.api, message.body ?? null, client);
    }
  }

  protected async handleAPIRequestMessage(
    message: ClientMessage,
    client?: WebSocket,
  ) {
    if (!message.id || !client || client.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      const response = await this.getAPIResponse(message.api!, message.body!);
      client.send(
        JSON.stringify({
          type: 'response',
          id: message.id,
          payload: response.res,
        }),
      );
    } catch (err) {
      client.send(
        JSON.stringify({
          type: 'response',
          id: message.id,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }

  public getSubscriptions(): Subscription[] {
    return [...this.map.values()].map(({ api, body }) => ({ api, body }));
  }

  protected saveRequestToMap<T extends SDK.ServerAPI.API>(
    api: T,
    body: SDK.ServerAPI.InferRequestBodyType<T, null> | null = null,
    client?: WebSocket,
  ) {
    const key = this.getSubscriptionKey(api, body);
    if (client) {
      if (!this.clientSubscriptions.has(client)) {
        this.clientSubscriptions.set(client, new Set());
      }
      const subscriptions = this.clientSubscriptions.get(client)!;
      if (subscriptions.has(key)) {
        return;
      }
      subscriptions.add(key);
    }

    const record = this.map.get(key);
    if (record) {
      record.count += 1;
      return;
    }

    this.map.set(key, {
      api,
      body,
      count: 1,
    });
  }

  protected removeRequestFromMap<T extends SDK.ServerAPI.API>(
    api: T,
    body: SDK.ServerAPI.InferRequestBodyType<T, null> | null = null,
    client?: WebSocket,
  ) {
    const key = this.getSubscriptionKey(api, body);
    if (client) {
      const subscriptions = this.clientSubscriptions.get(client);
      if (!subscriptions?.has(key)) {
        return;
      }
      subscriptions.delete(key);
      if (subscriptions.size === 0) {
        this.clientSubscriptions.delete(client);
      }
    }

    this.removeSubscriptionKey(key);
  }

  protected removeClientSubscriptions(client: WebSocket) {
    const subscriptions = this.clientSubscriptions.get(client);
    if (!subscriptions) {
      return;
    }

    subscriptions.forEach((key) => this.removeSubscriptionKey(key));
    this.clientSubscriptions.delete(client);
  }

  protected removeSubscriptionKey(key: string) {
    const record = this.map.get(key);
    if (!record) {
      return;
    }

    record.count -= 1;
    if (record.count <= 0) {
      this.map.delete(key);
    }
  }

  protected getSubscriptionKey(
    api: SDK.ServerAPI.API,
    body: Common.PlainObject | null,
  ) {
    return `${api}:${JSON.stringify(body ?? null)}`;
  }

  protected async getAPIResponse<T extends SDK.ServerAPI.API>(
    api: T,
    body: SDK.ServerAPI.InferRequestBodyType<T>,
  ) {
    const data = await this.loader.loadAPIData(
      api as SDK.ServerAPI.API.LoadDataByKey,
      body as SDK.ServerAPI.InferRequestBodyType<SDK.ServerAPI.API.LoadDataByKey>,
    );
    const response: SDK.ServerAPI.SocketResponseType = {
      req: {
        api,
        body,
      },
      res: data,
    };
    return response;
  }

  protected timer: NodeJS.Immediate | undefined;

  public async broadcast() {
    clearImmediate(this.timer);
    this.timer = setImmediate(async () => {
      const promises: Promise<void>[] = [];

      this.map.forEach(({ api, body }) => {
        promises.push(
          (async () => {
            const res = await this.getAPIResponse(api, body!);
            this.sendAPIData(api, res);
          })(),
        );
      });

      await Promise.all(promises);
    });
  }

  public sendAPIData<T extends SDK.ServerAPI.API | SDK.ServerAPI.APIExtends>(
    api: T,
    payload: SDK.ServerAPI.SocketResponseType<T>,
  ) {
    const message = JSON.stringify({ api, payload });
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  public dispose() {
    this.clients.forEach((client) => {
      client.close();
    });
    this.clients.clear();
    this.server?.close();
  }
}
