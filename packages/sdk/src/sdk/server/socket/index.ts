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

interface SocketOptions {
  sdk: SDK.RsdoctorBuilderSDKInstance;
  server: Server;
  port: number;
  socketOptions?: Partial<SocketServerOptions>;
}

function isAllowedCorsOrigin(
  origin: string | undefined,
  allowedOrigin: SDK.RsdoctorServerCorsStaticOrigin | undefined,
  defaultAllowed: boolean,
): boolean {
  if (origin === undefined) {
    return true;
  }

  if (typeof allowedOrigin === 'undefined') {
    return defaultAllowed;
  }

  if (typeof allowedOrigin === 'boolean') {
    return allowedOrigin;
  }

  if (typeof allowedOrigin === 'string') {
    return allowedOrigin === '*' || allowedOrigin === origin;
  }

  if (Array.isArray(allowedOrigin)) {
    return allowedOrigin.some((item) =>
      isAllowedCorsOrigin(origin, item, defaultAllowed),
    );
  }

  return allowedOrigin.test(origin);
}

function checkCorsOrigin(
  origin: string | undefined,
  corsOptions: SDK.RsdoctorServerCorsOptions | undefined,
  callback: (allowed: boolean) => void,
) {
  const allowedOrigin = corsOptions?.origin;

  if (typeof allowedOrigin === 'function') {
    allowedOrigin(origin, (err, result) => {
      callback(!err && isAllowedCorsOrigin(origin, result, false));
    });
    return;
  }

  callback(isAllowedCorsOrigin(origin, allowedOrigin, true));
}

export class Socket {
  protected io!: SocketServer;

  protected loader: SocketAPILoader;

  protected map: Map<SDK.ServerAPI.API, (Common.PlainObject | null)[]> =
    new Map();

  constructor(protected options: SocketOptions) {
    this.loader = new SocketAPILoader({ sdk: options.sdk });
  }

  public bootstrap() {
    const { socketOptions } = this.options;
    const hasCustomCorsOptions = typeof socketOptions?.cors !== 'undefined';

    this.io = new SocketServer(this.options.server, {
      ...socketOptions,
      cors: hasCustomCorsOptions
        ? socketOptions?.cors
        : {
            origin: (origin, callback) => {
              callback(null, isAllowedRequestOrigin(origin));
            },
          },
      allowRequest: (req, callback) => {
        const host = req.headers.host || req.headers[':authority'];
        if (!isAllowedRequestHost(host)) {
          callback(null, false);
          return;
        }

        const origin = Array.isArray(req.headers.origin)
          ? req.headers.origin[0]
          : req.headers.origin;
        const checkOrigin = hasCustomCorsOptions
          ? (next: (allowed: boolean) => void) => {
              checkCorsOrigin(
                origin,
                socketOptions?.cors as SDK.RsdoctorServerCorsOptions,
                next,
              );
            }
          : (next: (allowed: boolean) => void) => {
              next(isAllowedRequestOrigin(origin));
            };

        checkOrigin((allowed) => {
          if (!allowed) {
            callback(null, false);
            return;
          }

          if (socketOptions?.allowRequest) {
            socketOptions.allowRequest(req, callback);
            return;
          }

          callback(null, true);
        });
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
