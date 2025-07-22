import { Manifest, Plugin } from '@rsdoctor/types';
import { Utils as BuildUtils } from '@/build-utils/build';
import { interceptPluginHook } from '../utils';
import { InternalBasePlugin } from './base';
import { time, timeEnd } from '@rsdoctor/utils/logger';

export class InternalPluginsPlugin<
  T extends Plugin.BaseCompiler,
> extends InternalBasePlugin<T> {
  public readonly name = 'plugins';

  public apply(compiler: Plugin.BaseCompiler) {
    time('InternalPluginsPlugin.apply');
    try {
      compiler.hooks.afterPlugins.tap(
        this.tapPostOptions,
        this.afterPlugins.bind(this, compiler),
      );
      compiler.hooks.compilation.tap(this.tapPostOptions, this.compilation);
    } finally {
      timeEnd('InternalPluginsPlugin.apply');
    }
  }

  public afterPlugins = (compiler: Plugin.BaseCompiler) => {
    time('InternalPluginsPlugin.afterPlugins');
    try {
      if (compiler.isChild()) return;

      // intercept compiler hooks
      BuildUtils.interceptCompilerHooks(compiler, (name, hook) =>
        interceptPluginHook(this.sdk, name, hook),
      );

      // add plugins page to client
      this.sdk.addClientRoutes([
        Manifest.RsdoctorManifestClientRoutes.WebpackPlugins,
      ]);
    } finally {
      timeEnd('InternalPluginsPlugin.afterPlugins');
    }
  };

  public compilation = (compilation: Plugin.BaseCompilation): void => {
    time('InternalPluginsPlugin.compilation');
    try {
      if (compilation.compiler.isChild()) return;

      // intercept compilation hooks
      BuildUtils.interceptCompilationHooks(compilation, (name, hook) =>
        interceptPluginHook(this.sdk, name, hook),
      );
    } finally {
      timeEnd('InternalPluginsPlugin.compilation');
    }
  };
}
