import { InternalBasePlugin } from '@rsdoctor/core/plugins';
import { RsdoctorWebpackSDK } from '@rsdoctor/sdk';
import { Manifest, SDK } from '@rsdoctor/types';
import { Time } from '@rsdoctor/utils/common';
import path from 'path';
import type { Compiler, Resolver } from 'webpack';

interface RsdoctorResolverPluginOptions {}

interface ResolveRequestContext {
  issuer: string;
}

interface ResolveRequestWithContext {
  [key: string]: unknown;
  context: ResolveRequestContext;
}

/**
 * Plugin instance. ResolvePluginInstance in webpack@5.90 is not the interface, it's a type.
 */
declare interface ResolvePluginInstance {
  [index: string]: any;

  /**
   * The run point of the plugin, required method.
   */
  apply: (resolver: Resolver) => void;
}

export class RsdoctorResolverPlugin implements ResolvePluginInstance {
  protected tapOptions = {
    name: 'RsdoctorResolverPlugin',
  };

  protected contextMap = new Map<string, [number, [number, number]]>();

  constructor(
    protected options: RsdoctorResolverPluginOptions,
    protected sdk: RsdoctorWebpackSDK,
  ) {}

  protected getResolverData(
    context: ResolveRequestContext,
    params: {
      request: string;
      query?: string;
      result?: string;
      error?: Error;
      stacks?: SDK.ResolveStackData[];
    },
  ) {
    const ctx = this.contextMap.get(context.issuer);
    if (!ctx) return;

    const { request, query, result, error, stacks } = params;
    const [start, startHRTime] = ctx;
    const data: SDK.PathResolverBaseData = {
      isEntry: Boolean(context.issuer),
      issuerPath: context.issuer || '',
      request,
      startAt: start,
      endAt: Time.getCurrentTimestamp(start, startHRTime),
      pid: process.pid,
      ppid: process.ppid,
    };

    if (query) {
      data.query = query;
    }

    if (result) {
      (data as SDK.PathResolverSuccessData).result = result;
    }

    if (error) {
      (data as SDK.PathResolverFailData).error = error;
      (data as SDK.PathResolverFailData).stacks = stacks || [];
    }

    return data as SDK.PathResolverData;
  }

  protected getResolveStackData(
    request: ResolveRequestWithContext,
    path: string,
    name = 'anonymous',
  ) {
    const data: SDK.ResolveStackData = {
      name,
      // issuerPath: request.context.issuer,
      path,
    };

    const keys = [
      'request',
      'query',
      'fragment',
      'file',
      'module',
      'directory',
      'internal',
    ] as const;

    keys.forEach((key) => {
      if (request[key]) {
        data[key] = request[key] as any;
      }
    });

    return data;
  }

  protected getResolveRequest(
    request: string | undefined,
    ctx?: Parameters<Resolver['resolve']>[3],
  ) {
    if (request) return request;

    if (ctx?.stack) {
      // ctx.stack example:
      //   Set([
      //     'resolve: (/Users/node_modules/antd/es/card) ./Grid',
      //     'parsedResolve: (/Users/node_modules/antd/es/card) ./Grid',
      //     'resolved: (/Users/node_modules/@babel/runtime/helpers/esm/defineProperty.js) ',
      //   ]);

      const [target] = [...ctx.stack]
        .map((e) => e.split(' ').map((e) => e.trim()))
        .filter((e) => e.length > 2);

      if (target) {
        return target[target.length - 1];
      }
    }

    return '';
  }

  apply(resolver: Resolver) {
    // only calls the resolve success.
    resolver.hooks.result.tap(this.tapOptions, (request, resolveCtx) => {
      const { context } = request as unknown as ResolveRequestWithContext;
      const ctx = this.contextMap.get(context.issuer);
      // console.log(request.path, request.request, resolveCtx.stack);
      if (ctx) {
        const data = this.getResolverData(context, {
          request: this.getResolveRequest(request.request, resolveCtx),
          query: request.query,
          result: request.path as string,
        });
        data && this.sdk.reportResolver([data]);
      }
    });

    // only calls the resolve failed.
    resolver.hooks.noResolve.tap(this.tapOptions, (request, error) => {
      const { context } = request as unknown as ResolveRequestWithContext;

      if (context.issuer) {
        // https://github.com/webpack/enhanced-resolve/blob/main/lib/Resolver.js#L291
        // https://github.com/webpack/enhanced-resolve/blob/main/lib/Resolver.js#L305
        const resolvedPaths = new Set(
          (error as Error & { details: string }).details
            .split('\n')
            .map((e) => e.trim().split(' ')[0])
            .filter((e) => path.isAbsolute(e)),
        );

        if (resolvedPaths.size) {
          if (this.contextMap.has(context.issuer)) {
            const stacks = [...resolvedPaths].map((e) =>
              this.getResolveStackData(
                request as unknown as ResolveRequestWithContext,
                e,
                'noResolve',
              ),
            );

            const data = this.getResolverData(context, {
              request: this.getResolveRequest(request.request),
              query: request.query,
              error,
              stacks,
            });

            data && this.sdk.reportResolver([data]);
          }
        }
      }
    });

    resolver.hooks.resolveStep.tap(this.tapOptions, (_, request) => {
      const { context } = request as unknown as ResolveRequestWithContext;
      if (context.issuer && !this.contextMap.has(context.issuer)) {
        this.contextMap.set(context.issuer, [Date.now(), process.hrtime()]);
      }
    });
  }
}

export class InternalResolverPlugin extends InternalBasePlugin<Compiler> {
  public readonly name = 'resolver';

  public apply(compiler: Compiler) {
    // resolver depends on module graph
    this.scheduler.ensureModulesChunksGraphApplied(compiler);
    compiler.hooks.afterPlugins.tap(this.tapPostOptions, this.afterPlugins);
  }

  public afterPlugins = (compiler: Compiler) => {
    if (compiler.isChild()) return;

    // add plugin to collect the data of resolver
    compiler.options.resolve.plugins = (
      compiler.options.resolve.plugins ?? []
    ).concat(new RsdoctorResolverPlugin({}, this.sdk));

    // add resolver page to client
    this.sdk.addClientRoutes([
      Manifest.RsdoctorManifestClientRoutes.ModuleResolve,
    ]);
  };
}
