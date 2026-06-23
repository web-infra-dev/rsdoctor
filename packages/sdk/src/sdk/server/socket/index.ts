import { Common, SDK } from '@rsdoctor/types';
import type { Server } from 'http';
import {
  Server as SocketServer,
  ServerOptions as SocketServerOptions,
  Socket as SocketType,
} from 'socket.io';
import { isDeepStrictEqual } from 'util';
import { SocketAPILoader } from './api';
import { isAllowedRequestHost, isAllowedRequestOrigin } from '../security';

type StaticCorsOrigin =
  | boolean
  | string
  | RegExp
  | Array<boolean | string | RegExp>;
type CustomCorsOrigin = (
  requestOrigin: string | undefined,
  callback: (error: Error | null, origin?: StaticCorsOrigin) => void,
) => void;
type CorsOrigin = StaticCorsOrigin | CustomCorsOrigin | undefined;

interface SocketOptions {
  sdk: SDK.RsdoctorBuilderSDKInstance;
  server: Server;
  port: number;
  socketOptions?: SocketServerOptions;
}

export class Socket {
  protected io!: SocketServer;

  protected loader: SocketAPILoader;

  protected map: Map<SDK.ServerAPI.API, (Common.PlainObject | null)[]> =
    new Map();

  constructor(protected options: SocketOptions) {
    this.loader = new SocketAPILoader({ sdk: options.sdk });
  }

  private isAllowedSocketOrigin(
    origin: string | undefined,
    corsOrigin: CorsOrigin,
    callback: (allowed: boolean) => void,
  ) {
    if (corsOrigin === undefined) {
      callback(isAllowedRequestOrigin(origin));
      return;
    }

    if (typeof corsOrigin === 'function') {
      corsOrigin(origin, (error, result) => {
        callback(!error && this.matchCorsOrigin(origin, result));
      });
      return;
    }

    callback(this.matchCorsOrigin(origin, corsOrigin));
  }

  private matchCorsOrigin(
    origin: string | undefined,
    corsOrigin: StaticCorsOrigin | undefined,
  ): boolean {
    if (origin === undefined) {
      return true;
    }

    if (Array.isArray(corsOrigin)) {
      return corsOrigin.some((item) => this.matchCorsOrigin(origin, item));
    }

    if (corsOrigin instanceof RegExp) {
      return corsOrigin.test(origin);
    }

    return corsOrigin === true || corsOrigin === origin;
  }

  public bootstrap() {
    const { socketOptions } = this.options;
    const corsOptions =
      socketOptions?.cors &&
      typeof socketOptions.cors === 'object' &&
      !Array.isArray(socketOptions.cors)
        ? socketOptions.cors
        : {};

    this.io = new SocketServer(this.options.server, {
      ...socketOptions,
      cors: {
        ...corsOptions,
        origin: (origin, callback) => {
          this.isAllowedSocketOrigin(origin, corsOptions.origin, (allowed) => {
            callback(null, allowed);
          });
        },
      },
      allowRequest: (req, callback) => {
        const host = req.headers.host || req.headers[':authority'];
        if (!isAllowedRequestHost(host)) {
          callback(null, false);
          return;
        }

        this.isAllowedSocketOrigin(
          req.headers.origin,
          corsOptions.origin,
          (allowed) => {
            if (!allowed) {
              callback(null, false);
              return;
            }

            callback(null, true);
          },
        );
      },
    });
    this.io.on('connection', (socket) => {
      // setup event listeners for every socket which connected
      this.setupSocket(socket);
    });
  }

  protected setupSocket(socket: SocketType) {
    // setup server api load request
    Object.values(SDK.ServerAPI.API).forEach((api) => {
      // server received the request for server api
      // and the first argument is request body.
      socket.on(api, async (body, callback) => {
        // save to map for server side emit event to client.
        this.saveRequestToMap(api, body);

        // server will send the response for server api
        callback(await this.getAPIResponse(api, body));
      });
    });
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
              this.io.emit(api, res);
            })(),
          );
        });
      });

      await Promise.all(promises);
    });
  }

  public sendAPIData<T extends SDK.ServerAPI.API | SDK.ServerAPI.APIExtends>(
    api: T,
    msg: SDK.ServerAPI.SocketResponseType<T>,
  ) {
    this.io.sockets.emit(api, msg);
  }

  public dispose() {
    this.io.disconnectSockets();
    this.io.close();
  }
}
