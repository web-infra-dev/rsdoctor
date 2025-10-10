import { Manifest, Plugin } from '@rsdoctor/types';
import type { HookInterceptor } from 'tapable';
import { Loader } from '@rsdoctor/utils/common';
import { cloneDeep, isEqual, omit } from 'lodash-es';
import { LoaderContext, NormalModule } from 'webpack';
import { interceptLoader } from '../utils';
import { InternalBasePlugin } from './base';
import { ProxyLoaderOptions } from '@/types';
import { time, timeEnd } from '@rsdoctor/utils/logger';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class InternalLoaderPlugin<
  T extends Plugin.BaseCompiler,
> extends InternalBasePlugin<T> {
  public readonly name = 'loader';

  // TODO: find the reason why using loader/proxy.js causes this problem https://github.com/web-infra-dev/rsdoctor/pull/1271.
  public readonly internalLoaderPath: string = (() => {
    // Try to resolve proxy-esm.js first (ESM), fallback to proxy.cjs (CJS)
    try {
      return require.resolve(path.join(__dirname, `../loaders/proxy-esm.js`));
    } catch {
      return require.resolve(path.join(__dirname, `../loaders/proxy.cjs`));
    }
  })();

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
      this.sdk.addClientRoutes([
        Manifest.RsdoctorManifestClientRoutes.WebpackLoaders,
      ]);
    } finally {
      timeEnd('InternalLoaderPlugin.afterPlugins');
    }
  };

  public compilation(compiler: T, compilation: Plugin.BaseCompilation) {
    time('InternalLoaderPlugin.compilation');
    try {
      if (compiler.isChild()) return;

      /**
       * some plugin will overwrite and validate loader or loader options in [normalModuleLoader](https://webpack.js.org/api/compilation-hooks/#normalmoduleloader) hook.
       * such as (@arco-plugins/webpack-react)[https://github.com/arco-design/arco-plugins/blob/main/packages/plugin-webpack-react/src/arco-design-plugin/utils/index.ts#L134]
       */
      // TODO: compatible rspack normalmodule type
      const wrapper =
        (callback: Function) =>
        (loaderContext: LoaderContext<unknown>, module: NormalModule) => {
          // loaders which are already intercepted in afterPlugins hook by Rsdoctor.
          const proxyLoaders = module?.loaders || loaderContext?.loaders || [];

          // return origin loaders not doctor internal loaders
          const originLoaders = proxyLoaders.map((loader) => {
            const opts: ProxyLoaderOptions = loader.options || {};

            if (opts[Loader.LoaderInternalPropertyName]) {
              return {
                ...loader,
                loader: opts[Loader.LoaderInternalPropertyName].loader,
                options: omit(opts, Loader.LoaderInternalPropertyName),
              };
            }

            return loader;
          });

          const newLoaders = cloneDeep(originLoaders);
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
                const _newValue = cloneDeep(newValue);
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
                  options: e.options,
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

      const interceptor: HookInterceptor<[object, NormalModule], void> = {
        register(tap) {
          const originFn = tap.fn;
          if (typeof originFn === 'function') {
            tap.fn = wrapper(originFn);
          }
          return tap;
        },
      };

      compiler.webpack.NormalModule.getCompilationHooks(
        compilation as Plugin.BaseCompilationType &
          Plugin.BaseCompilationType<'rspack'>,
      ).loader.intercept(interceptor);
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
      this.sdk.root,
      'resolveLoader' in compiler.options ? compiler.options.resolveLoader : {},
    );
  }
}
