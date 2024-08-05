import { Manifest, Plugin } from '@rsdoctor/types';
import type { HookInterceptor } from 'tapable';
import { Loader } from '@rsdoctor/utils/common';
import { cloneDeep, isEqual, omit } from 'lodash';
import { LoaderContext, NormalModule } from 'webpack';
import { interceptLoader } from '../utils';
import { InternalBasePlugin } from './base';
import { ProxyLoaderOptions } from '@/types';

export class InternalLoaderPlugin<
  T extends Plugin.BaseCompiler,
> extends InternalBasePlugin<T> {
  public readonly name = 'loader';

  public readonly internalLoaderPath = require.resolve('../loaders/proxy');

  public apply(compiler: T) {
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
  }

  public afterPlugins = (compiler: T) => {
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
  };

  public compilation(compiler: T, compilation: Plugin.BaseCompilation) {
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

    if (compiler.webpack?.NormalModule?.getCompilationHooks) {
      // webpack5 or rspack
      compiler.webpack.NormalModule.getCompilationHooks(
        compilation as Plugin.BaseCompilationType &
          Plugin.BaseCompilationType<'rspack'>,
      ).loader.intercept(interceptor);
    } else if ('normalModuleLoader' in compilation.hooks) {
      // webpack4
      'normalModuleLoader' in compilation.hooks &&
        compilation.hooks.normalModuleLoader.intercept(interceptor);
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
