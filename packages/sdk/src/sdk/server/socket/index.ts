import { Common, SDK } from '@rsdoctor/types';
import type { Server } from 'http';
import { isDeepStrictEqual } from 'util';
import WebSocket, { WebSocketServer } from 'ws';
import { SocketAPILoader } from './api';

interface SocketOptions {
  sdk: SDK.RsdoctorBuilderSDKInstance;
  server: Server;
  port: number;
}

type Subscription = {
  api: SDK.ServerAPI.API;
  body: Common.PlainObject | null;
};

type ClientMessage = {
  type?: string;
  id?: string;
  api?: SDK.ServerAPI.API;
  body?: Common.PlainObject | null;
};

export class Socket {
  protected server?: WebSocketServer;

  protected clients = new Set<WebSocket>();

  protected loader: SocketAPILoader;

  protected map: Map<SDK.ServerAPI.API, (Common.PlainObject | null)[]> =
    new Map();

  constructor(protected options: SocketOptions) {
    this.loader = new SocketAPILoader({ sdk: options.sdk });
  }

  public bootstrap() {
    this.server = new WebSocketServer({ server: this.options.server });
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
      this.saveRequestToMap(message.api, message.body ?? null);
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
    const subscriptions: Subscription[] = [];
    this.map.forEach((bodies, api) => {
      bodies.forEach((body) => subscriptions.push({ api, body }));
    });
    return subscriptions;
  }

  protected saveRequestToMap<T extends SDK.ServerAPI.API>(
    api: T,
    body: SDK.ServerAPI.InferRequestBodyType<T, null> | null = null,
  ) {
    if (!this.map.has(api)) {
      this.map.set(api, []);
    }

    const list = this.map.get(api)!;

    if (!list.some((e) => e === body || isDeepStrictEqual(e, body))) {
      list.push(body);
    }
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

      this.map.forEach((bodies, api) => {
        bodies.forEach((body) => {
          promises.push(
            (async () => {
              const res = await this.getAPIResponse(api, body!);
              this.sendAPIData(api, res);
            })(),
          );
        });
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
