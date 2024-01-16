
import { Manifest, Plugin } from '@rsdoctor/types';
import { InternalBasePlugin } from './base';
import { Chunks } from '@/build-utils/common';


export class InternalBundlePlugin<
  T extends Plugin.BaseCompiler,
> extends InternalBasePlugin<T> {
  public readonly name = 'bundle';

  public map: Map<string, { content: string }> = new Map();

  public apply(compiler: T) {
    // bundle depends on module graph
    this.scheduler.ensureModulesChunksGraphApplied(compiler);
    compiler.hooks.compilation.tap(this.tapPostOptions, this.thisCompilation);
    compiler.hooks.done.tapPromise(this.tapPreOptions, this.done.bind(this));
  }

  public ensureAssetContent(name: string) {
    const asset = this.map.get(name);
    if (asset) return asset;
    const v = { content: '' };
    this.map.set(name, v);
    return v;
  }

  public thisCompilation = (compilation: Plugin.BaseCompilation) => {
    // save asset content to map
    if (
      compilation.hooks.processAssets &&
      'afterOptimizeAssets' in compilation.hooks
    ) {
      compilation.hooks.afterOptimizeAssets.tap(
        this.tapPostOptions,
        (assets) => {
          Object.keys(assets).forEach((file) => {
            const v = this.ensureAssetContent(file);
            v.content = assets[file].source().toString();
          });
        },
      );
    } else if (
      compilation.hooks.processAssets &&
      'afterProcessAssets' in compilation.hooks
    )  { 
      // This is for rspack hooks.
      compilation.hooks.afterProcessAssets.tap(
        this.tapPostOptions,
        () => {
          Object.keys(compilation.assets).forEach((file) => {
            const v = this.ensureAssetContent(file);
            v.content = compilation.assets[file].source().toString();
          });
        },
      );
    } else if ('afterOptimizeChunkAssets' in compilation.hooks)  { 
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
  };

  public done = async (): Promise<void> => {
    Chunks.assetsContents(this.map, this.scheduler.chunkGraph);

    this.sdk.addClientRoutes([
      Manifest.DoctorManifestClientRoutes.ModuleGraph,
      Manifest.DoctorManifestClientRoutes.BundleSize,
    ]);
  };
}
