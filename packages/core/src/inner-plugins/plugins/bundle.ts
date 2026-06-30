import { Manifest, Plugin } from '@rsdoctor/types';
import type { Assets } from '@rspack/core';
import { InternalBasePlugin } from './base';
import { Chunks } from '@rsdoctor/core/graph';
import { logger, time, timeEnd } from '@rsdoctor/core/logger';

export class InternalBundlePlugin<
  T extends Plugin.BaseCompiler,
> extends InternalBasePlugin<T> {
  public readonly name = 'bundle';

  public map: Map<string, { content: string }> = new Map();

  public apply(compiler: T) {
    time('InternalBundlePlugin.apply');
    try {
      // bundle depends on module graph
      this.scheduler.ensureModulesChunksGraphApplied(compiler);
      this.changeDevtoolModuleFilename(compiler);

      compiler.hooks.compilation.tap(this.tapPostOptions, this.thisCompilation);
      compiler.hooks.done.tapPromise(this.tapPreOptions, this.done.bind(this));
    } finally {
      timeEnd('InternalBundlePlugin.apply');
    }
  }
  changeDevtoolModuleFilename(compiler: Plugin.BaseCompiler) {
    const devtool = compiler.options.devtool;
    if (devtool) {
      if (!compiler.options.output) {
        compiler.options.output = {} as typeof compiler.options.output;
      }

      compiler.options.output.devtoolModuleFilenameTemplate =
        '[absolute-resource-path]';

      logger.warn(
        `output.devtoolModuleFilenameTemplate has been changed to [absolute-resource-path], this is for bundle analysis.`,
      );

      if (typeof devtool === 'string' && devtool.includes('source-map')) {
        compiler.options.output.devtoolFallbackModuleFilenameTemplate = () =>
          '[absolute-resource-path]';
      }
    }
  }

  public ensureAssetContent(name: string) {
    const asset = this.map.get(name);
    if (asset) return asset;
    const v = { content: '' };
    this.map.set(name, v);
    return v;
  }

  public thisCompilation = (compilation: Plugin.BaseCompilation) => {
    time('InternalBundlePlugin.thisCompilation');
    try {
      // save asset content to map
      if (compilation.hooks.processAssets) {
        compilation.hooks.afterProcessAssets.tap(
          this.tapPostOptions,
          (assets: Assets) => {
            Object.keys(assets).forEach((file) => {
              const v = this.ensureAssetContent(file);
              v.content = assets[file].source().toString();
            });
          },
        );
      }
    } finally {
      timeEnd('InternalBundlePlugin.thisCompilation');
    }
  };

  public done = async (): Promise<void> => {
    time('InternalBundlePlugin.done');
    try {
      if (this.scheduler.chunkGraph) {
        Chunks.assetsContents(
          this.map,
          this.scheduler.chunkGraph,
          this.scheduler.options?.supports,
        );
      }

      this.sdk.addClientRoutes([
        Manifest.RsdoctorManifestClientRoutes.ModuleGraph,
        Manifest.RsdoctorManifestClientRoutes.BundleSize,
      ]);
    } finally {
      timeEnd('InternalBundlePlugin.done');
    }
  };
}
