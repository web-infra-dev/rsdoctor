import type { ServerResponse } from 'http';
import { Common, SDK, Thirdparty } from '@rsdoctor/types';
import { BaseAPI } from './apis/base';

interface RouterOptions {
  apis: Common.Constructor<typeof BaseAPI>[];
  sdk: SDK.RsdoctorBuilderSDKInstance;
  server: SDK.RsdoctorServerInstance;
}

const normalizeAPIKey = (key: unknown): PropertyKey => {
  if (key && typeof key === 'object' && 'name' in key) {
    return (key as { name: PropertyKey }).name;
  }
  return key as PropertyKey;
};

export class Router {
  static routes = {
    /**
     * - `key` is the constructor of object which used to match the API class
     */
    get: new Map<
      Common.Constructor<typeof BaseAPI>,
      Array<[apiKey: PropertyKey, pathname: string]>
    >(),
    post: new Map<
      Common.Constructor<typeof BaseAPI>,
      Array<[apiKey: PropertyKey, pathname: string]>
    >(),
  };

  static get(pathname: string): MethodDecorator {
    return (<T extends Common.Function>(
      target: Common.Constructor<typeof BaseAPI>,
      propertyKey: PropertyKey,
      descriptor: TypedPropertyDescriptor<T>,
    ) => {
      const routes = Router.routes.get;
      const constructor = target.constructor as Common.Constructor<
        typeof BaseAPI
      >;
      if (!routes.has(constructor)) {
        routes.set(constructor, []);
      }
      routes.get(constructor)!.push([normalizeAPIKey(propertyKey), pathname]);
      return descriptor;
    }) as MethodDecorator;
  }

  static post(pathname: string): MethodDecorator {
    return (<T extends Common.Function>(
      target: Common.Constructor<typeof BaseAPI>,
      propertyKey: PropertyKey,
      descriptor: TypedPropertyDescriptor<T>,
    ) => {
      const routes = Router.routes.post;
      const constructor = target.constructor as Common.Constructor<
        typeof BaseAPI
      >;
      if (!routes.has(constructor)) {
        routes.set(constructor, []);
      }
      routes.get(constructor)!.push([normalizeAPIKey(propertyKey), pathname]);
      return descriptor;
    }) as MethodDecorator;
  }

  constructor(protected options: RouterOptions) {}

  public async setup() {
    const { apis, sdk, server } = this.options;

    apis.forEach((API) => {
      const obj = new API(sdk, server);
      Router.routes.get.get(API)?.forEach(([key, pathname]) => {
        server.get(pathname, this.wrapAPIFunction(obj, key));
      });

      Router.routes.post.get(API)?.forEach(([key, pathname]) => {
        server.post(pathname, this.wrapAPIFunction(obj, key));
      });
    });
  }

  public wrapAPIFunction<T extends BaseAPI>(api: T, key: PropertyKey) {
    const { sdk, server } = this.options;

    return async (
      req: Thirdparty.connect.IncomingMessage,
      res: ServerResponse,
    ) => {
      const ctx: SDK.ServerAPI.APIContext = {
        req,
        res,
        sdk,
        server,
      };

      const trap = new Proxy(api, {
        get(target, key, receiver) {
          switch (key) {
            case 'ctx':
              return ctx;
            default:
              return Reflect.get(target, key, receiver);
          }
        },
        set(target, key, value, receiver) {
          return Reflect.set(target, key, value, receiver);
        },
        defineProperty(target, p, attrs) {
          return Reflect.defineProperty(target, p, attrs);
        },
      });

      const fn = api[key] as Common.Function<[T], unknown>;
      const result = await fn.call(trap, trap);
      // transform to Buffer
      if (typeof result === 'string') {
        return Buffer.from(result, 'utf-8');
      }
      if (result && typeof result === 'object') {
        return Buffer.from(JSON.stringify(result), 'utf-8');
      }
      return result;
    };
  }
}
