import { Plugin } from '@rsdoctor/types';
import { extname } from 'path';
import { InternalBasePlugin } from './base';
import { chalk, logger } from '@rsdoctor/utils/logger';

export class InternalBundleTagPlugin<
  T extends Plugin.BaseCompiler,
> extends InternalBasePlugin<T> {
  public readonly name = 'bundleTag';

  public apply(compiler: Plugin.BaseCompiler) {
    const supportBannerPlugin = this.options.supports?.banner;
    compiler.hooks.compilation.tap(
      'RsdoctorTagBannerPlugin',
      (compilation: Plugin.BaseCompilation) => {
        compilation.hooks.processAssets.tapPromise(
          {
            name: 'RsdoctorTagBannerPlugin',
            stage: -2000,
          },
          async () => {
            if (supportBannerPlugin === false) {
              return;
            }
            logger.info(
              chalk.bgMagenta(
                'Rsdoctor BannerTagPlugin has open. Do not use Rsdoctor on production version.',
              ),
            );

            const chunks = compilation.chunks;
            for (let chunk of chunks) {
              for (const file of chunk.files) {
                if (!file || extname(file) !== '.js') {
                  continue;
                }

                const { ConcatSource } = compiler.webpack.sources;

                compilation.updateAsset(
                  file,
                  (old: any) => {
                    const concatSource = new ConcatSource();
                    let header = "\n console.log('RSDOCTOR_START::');\n";
                    let footer = "\n console.log('RSDOCTOR_END::');\n";

                    concatSource.add(header);
                    concatSource.add(old);
                    concatSource.add(footer);
                    return concatSource;
                  },
                  () => {},
                );
              }
            }
          },
        );
      },
    );
  }
}
