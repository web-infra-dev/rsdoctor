import type { ServerResponse } from 'http';
import { Common, SDK, Thirdparty } from '@rsdoctor/types';
import { BaseAPI } from './apis/base';

interface RouterOptions {
  apis: Common.Constructor<typeof BaseAPI>[];
  sdk: SDK.RsdoctorBuilderSDKInstance;
  server: SDK.RsdoctorServerInstance;
}

type APIConstructor = Common.Constructor<typeof BaseAPI>;

type StandardMethodDecoratorContext = {
  name: PropertyKey;
  addInitializer(initializer: (this: unknown) => void): void;
};

function isStandardMethodDecoratorContext(
  value: unknown,
): value is StandardMethodDecoratorContext {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof (value as { addInitializer?: unknown }).addInitializer === 'function'
  );
}

export class Router {
  static routes = {
    /**
     * - `key` is the constructor of object which used to match the API class
     */
    get: new Map<
      APIConstructor,
      Array<[apiKey: PropertyKey, pathname: string]>
    >(),
    post: new Map<
      APIConstructor,
      Array<[apiKey: PropertyKey, pathname: string]>
    >(),
  };

  private static addRoute(
    method: keyof typeof Router.routes,
    constructor: APIConstructor,
    propertyKey: PropertyKey,
    pathname: string,
  ) {
    const routes = Router.routes[method];
    if (!routes.has(constructor)) {
      routes.set(constructor, []);
    }

    const apiRoutes = routes.get(constructor)!;
    if (
      !apiRoutes.some(
        ([registeredKey, registeredPathname]) =>
          registeredKey === propertyKey && registeredPathname === pathname,
      )
    ) {
      apiRoutes.push([propertyKey, pathname]);
    }
  }

  static get(pathname: string): MethodDecorator {
    return ((
      target: object,
      contextOrKey: PropertyKey | StandardMethodDecoratorContext,
    ) => {
      if (isStandardMethodDecoratorContext(contextOrKey)) {
        contextOrKey.addInitializer(function (this: unknown) {
          Router.addRoute(
            'get',
            (this as BaseAPI).constructor as APIConstructor,
            contextOrKey.name,
            pathname,
          );
        });
        return target;
      }

      Router.addRoute(
        'get',
        (target as { constructor: APIConstructor }).constructor,
        contextOrKey,
        pathname,
      );
      return;
    }) as MethodDecorator;
  }

  static post(pathname: string): MethodDecorator {
    return ((
      target: object,
      contextOrKey: PropertyKey | StandardMethodDecoratorContext,
    ) => {
      if (isStandardMethodDecoratorContext(contextOrKey)) {
        contextOrKey.addInitializer(function (this: unknown) {
          Router.addRoute(
            'post',
            (this as BaseAPI).constructor as APIConstructor,
            contextOrKey.name,
            pathname,
          );
        });
        return target;
      }

      Router.addRoute(
        'post',
        (target as { constructor: APIConstructor }).constructor,
        contextOrKey,
        pathname,
      );
      return;
    }) as MethodDecorator;
  }

  constructor(protected options: RouterOptions) {}

  public async setup() {
    const { apis, sdk, server } = this.options;
    const instances = new Map<APIConstructor, BaseAPI>();

    apis.forEach((API) => {
      if (typeof API === 'function' && !instances.has(API)) {
        instances.set(API, new API(sdk, server));
      }
    });

    const getInstance = (API: APIConstructor) => {
      if (!instances.has(API)) {
        instances.set(API, new API(sdk, server));
      }
      return instances.get(API)!;
    };

    Router.routes.get.forEach((routes, API) => {
      const obj = getInstance(API);
      routes.forEach(([key, pathname]) => {
        server.get(pathname, this.wrapAPIFunction(obj, key));
      });
    });

    Router.routes.post.forEach((routes, API) => {
      const obj = getInstance(API);
      routes.forEach(([key, pathname]) => {
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

      const fn = api[key] as Function;
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
