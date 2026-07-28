import { Manifest, Plugin } from '@rsdoctor/shared/types';
import { Loader } from '@rsdoctor/core/common';
import { createRequire } from 'node:module';
import { isEqual, omit } from '@rsdoctor/core/collection';
import type { LoaderContext, NormalModule } from '@rspack/core';
import { interceptLoader } from '../utils';
import { InternalBasePlugin } from './base';
import type { ProxyLoaderOptions } from '../../types';
import { time, timeEnd } from '@/logger';
import { safeCloneDeep } from '../utils/plugin-common';

const require = createRequire(import.meta.url);

type MutableNormalModule = Omit<NormalModule, 'loaders'> & {
  loaders: Array<{ loader: string; options?: unknown }>;
};

type LoaderHookCallback = (
  loaderContext: LoaderContext<unknown>,
  module: MutableNormalModule,
) => void;

export class InternalLoaderPlugin<
  T extends Plugin.BaseCompiler,
> extends InternalBasePlugin<T> {
  public readonly name = 'loader';

  public readonly internalLoaderPath =
    require.resolve('@rsdoctor/core/proxy-loader');

  public apply(compiler: T) {
    time('InternalLoaderPlugin.apply');
    try {
      // make sure that loaders were intercepted.
      compiler.hooks.afterPlugins.tap(
        this.tapPostOptions,
        this.afterPlugins.bind(this, compiler),
      );

      compiler.hooks.compilation.tap(
        this.tapPreOptions,
        (compilation: Plugin.BaseCompilation) =>
          this.compilation(compiler, compilation),
      );
    } finally {
      timeEnd('InternalLoaderPlugin.apply');
    }
  }

  public afterPlugins = (compiler: T) => {
    time('InternalLoaderPlugin.afterPlugins');
    try {
      if (compiler.isChild()) return;
      // intercept loader to collect the costs of loaders
      compiler.options.module.rules = this.getInterceptRules(
        compiler,
        compiler.options.module.rules as Plugin.BuildRuleSetRules,
      ) as Plugin.BuildRuleSetRules;

      // add loader page to client
      this.sdk.addClientRoutes([Manifest.RsdoctorManifestClientRoutes.Loaders]);
    } finally {
      timeEnd('InternalLoaderPlugin.afterPlugins');
    }
  };

  public compilation(compiler: T, compilation: Plugin.BaseCompilation) {
    time('InternalLoaderPlugin.compilation');
    try {
      if (compiler.isChild()) return;

      /**
       * Some plugins overwrite and validate loader or loader options in the normalModuleLoader hook.
       */
      const wrapper =
        (callback: LoaderHookCallback) =>
        (
          loaderContext: LoaderContext<unknown>,
          module: MutableNormalModule,
        ) => {
          // loaders which are already intercepted in afterPlugins hook by Rsdoctor.
          const proxyLoaders = module?.loaders || loaderContext?.loaders || [];

          // return origin loaders not doctor internal loaders
          const originLoaders = proxyLoaders.map((loader) => {
            const rawOptions = loader.options;
            const opts = (
              typeof rawOptions === 'object' && rawOptions !== null
                ? rawOptions
                : {}
            ) as ProxyLoaderOptions;

            if (opts[Loader.LoaderInternalPropertyName]) {
              return {
                ...loader,
                loader: opts[Loader.LoaderInternalPropertyName].loader,
                options: omit(opts, Loader.LoaderInternalPropertyName),
              };
            }

            return loader;
          });

          const newLoaders = safeCloneDeep(originLoaders);
          if (
            typeof compiler.options.cache === 'object' &&
            'version' in compiler.options.cache &&
            typeof compiler.options.cache.version === 'string' &&
            compiler.options.cache.version.indexOf('next/dist/build') > -1
          ) {
            callback(loaderContext, module || {});
          } else {
            const proxyModule = new Proxy(module || {}, {
              get(target, p, receiver) {
                if (p === 'loaders') return newLoaders;
                return Reflect.get(target, p, receiver);
              },
              set(target, p, newValue, receiver) {
                const _newValue = safeCloneDeep(newValue);
                if (p === 'loaders') {
                  if (Array.isArray(_newValue)) {
                    newLoaders.length = 0;
                    _newValue.forEach((e) => {
                      newLoaders.push(e);
                    });
                  }
                }
                return Reflect.set(target, p, _newValue, receiver);
              },
              deleteProperty(target, p) {
                return Reflect.deleteProperty(target, p);
              },
            });
            callback(loaderContext, proxyModule);
          }

          // loaders are overwrite when originLoader is not same with newLoaders
          if (!isEqual(originLoaders, newLoaders)) {
            // intercept new loaders
            const rules = this.getInterceptRules(
              compiler,
              newLoaders.map((e) => {
                return {
                  loader: e.loader,
                  options: e.options ?? undefined,
                };
              }),
            );

            module.loaders = rules.map((e, i) => {
              return {
                ...newLoaders[i],
                loader: e.loader!,
                options: e.options,
              };
            });
          }
        };

      const loaderHook = compiler.rspack.NormalModule.getCompilationHooks(
        compilation as Plugin.BaseCompilationType<'rspack'>,
      ).loader;
      const interceptor: Parameters<typeof loaderHook.intercept>[0] = {
        register(tap) {
          const originFn = tap.fn;
          if (typeof originFn === 'function') {
            tap.fn = wrapper(originFn as LoaderHookCallback);
          }
          return tap;
        },
      };

      loaderHook.intercept(interceptor);
    } finally {
      timeEnd('InternalLoaderPlugin.compilation');
    }
  }

  public getInterceptRules(
    compiler: T,
    rules: Plugin.BuildRuleSetRules,
  ): Plugin.BuildRuleSetRule[] {
    return interceptLoader(
      rules as Plugin.BuildRuleSetRule[],
      this.internalLoaderPath,
      {
        cwd: compiler.context || process.cwd(),
        host: this.sdk.server.origin,
        skipLoaders: this.options.loaderInterceptorOptions.skipLoaders, // not implement
      },
      compiler.resolverFactory.get('loader', compiler.options.resolveLoader),
      this.sdk.root,
    );
  }
}
