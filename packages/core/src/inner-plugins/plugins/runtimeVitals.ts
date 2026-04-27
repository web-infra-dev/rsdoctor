import { Manifest, Plugin } from '@rsdoctor/types';
import { InternalBasePlugin } from './base';
import { createVitalsSnippet } from './runtimeVitalsSnippet';
import { time, timeEnd } from '@rsdoctor/utils/logger';

export class InternalRuntimeVitalsPlugin<
  T extends Plugin.BaseCompiler,
> extends InternalBasePlugin<T> {
  public readonly name = 'runtimeVitals';

  public apply(compiler: Plugin.BaseCompiler) {
    time('InternalRuntimeVitalsPlugin.apply');
    try {
      const reportUrl = `${this.sdk.server.origin}${'/api/runtime/vitals/report'}`;

      compiler.hooks.compilation.tap(
        this.tapPostOptions,
        (compilation: Plugin.BaseCompilation) => {
          if (!compilation.hooks.processAssets) return;

          compilation.hooks.processAssets.tap(
            {
              name: 'RsdoctorRuntimeVitals',
              stage: 100,
            },
            () => {
              const snippet = createVitalsSnippet(reportUrl);
              const { ConcatSource } = compiler.webpack.sources;

              for (const chunk of compilation.chunks) {
                if (!chunk.canBeInitial()) continue;

                for (const file of chunk.files) {
                  if (!file.endsWith('.js')) continue;

                  compilation.updateAsset(
                    file,
                    // @ts-ignore - webpack/rspack type compatibility issue
                    (old: unknown) => {
                      const source = new ConcatSource();
                      source.add(old as any);
                      source.add(snippet);
                      return source;
                    },
                    () => {},
                  );
                  break;
                }
              }
            },
          );
        },
      );

      this.sdk.addClientRoutes([
        Manifest.RsdoctorManifestClientRoutes.RuntimePerf,
      ]);
    } finally {
      timeEnd('InternalRuntimeVitalsPlugin.apply');
    }
  }
}
