import { Manifest, Plugin } from '@rsdoctor/types';
import { InternalBasePlugin } from './base';
import { Chunks } from '@/build-utils/common';
import { time, timeEnd } from '@rsdoctor/utils/logger';

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

      compiler.hooks.compilation.tap(
        {
          name: 'ChangeDevtoolModuleFilename',
          stage: -100,
        },
        () => {
          this.changeDevtoolModuleFilename(compiler);
        },
      );

      compiler.hooks.compilation.tap(this.tapPostOptions, this.thisCompilation);
      compiler.hooks.done.tapPromise(this.tapPreOptions, this.done.bind(this));
    } finally {
      timeEnd('InternalBundlePlugin.apply');
    }
  }
  changeDevtoolModuleFilename(compiler: Plugin.BaseCompiler) {
    if ('rspack' in compiler) {
      return;
    }

    const devtool = compiler.options.devtool;
    if (devtool) {
      if (!compiler.options.output) {
        compiler.options.output = {} as any;
      }

      compiler.options.output.devtoolModuleFilenameTemplate =
        '[absolute-resource-path]';

      if (devtool.includes('source-map')) {
        compiler.options.output.devtoolFallbackModuleFilenameTemplate =
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
      if (
        compilation.hooks.processAssets &&
        'afterOptimizeAssets' in compilation.hooks
      ) {
        compilation.hooks.afterOptimizeAssets.tap(
          this.tapPostOptions,
          (assets: any) => {
            Object.keys(assets).forEach((file) => {
              const v = this.ensureAssetContent(file);
              v.content = assets[file].source().toString();
            });
          },
        );
      } else if (
        compilation.hooks.processAssets &&
        'afterProcessAssets' in compilation.hooks
      ) {
        // This is for rspack hooks.
        compilation.hooks.afterProcessAssets.tap(this.tapPostOptions, () => {
          Object.keys(compilation.assets).forEach((file) => {
            const v = this.ensureAssetContent(file);
            v.content = compilation.assets[file].source().toString();
          });
        });
      } else if ('afterOptimizeChunkAssets' in compilation.hooks) {
        compilation.hooks.afterOptimizeChunkAssets.tap(
          this.tapPostOptions,
          (chunks) => {
            [...chunks]
              .reduce<string[]>((t, chunk) => t.concat([...chunk.files]), [])
              .forEach((file) => {
                const v = this.ensureAssetContent(file);
                v.content = compilation.assets[file].source().toString();
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
