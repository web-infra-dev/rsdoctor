import { Plugin } from '@rsdoctor/types';
import { extname } from 'path';
import { InternalBasePlugin } from './base';
import { chalk, logger } from '@rsdoctor/utils/logger';
import { time, timeEnd } from '@rsdoctor/utils/logger';

export class InternalBundleTagPlugin<
  T extends Plugin.BaseCompiler,
> extends InternalBasePlugin<T> {
  public readonly name = 'bundleTag';

  public apply(compiler: Plugin.BaseCompiler) {
    time('InternalBundleTagPlugin.apply');
    try {
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
              if (
                (!compilation.options.plugins
                  .map((p) => p && p.constructor.name)
                  .includes('BannerPlugin') &&
                  supportBannerPlugin !== true) ||
                supportBannerPlugin === false ||
                // rspack no need to use this plugin
                'rspack' in compiler
              ) {
                return;
              }
              logger.info(
                chalk.magenta(
                  "Rsdoctor's `supports.banner` option is enabled, this is for debugging only. Do not use it for production.",
                ),
              );

              // Check minimizers's drop_console configuration
              const minimizers = compiler.options.optimization?.minimizer || [];
              const terserPlugin = minimizers.find(
                (plugin): boolean =>
                  plugin?.constructor?.name === 'TerserPlugin',
              ) as any;
              const swcPlugin = minimizers.find(
                (plugin): boolean =>
                  plugin?.constructor?.name === 'SwcJsMinimizerRspackPlugin',
              ) as any;

              const hasTerserPlugin = !!terserPlugin;
              const hasSwcJsMinimizer = !!swcPlugin;

              if (hasTerserPlugin || hasSwcJsMinimizer) {
                const terserDropConsole =
                  terserPlugin?.options?.minimizer?.options?.compress
                    ?.drop_console;
                const swcDropConsole =
                  swcPlugin?._args?.[0]?.minimizerOptions?.compress
                    ?.drop_console;

                if (terserDropConsole === true || swcDropConsole === true) {
                  logger.warn(
                    chalk.yellow(
                      'Warning: BannerPlugin detected in project. Please disable drop_console option in TerserPlugin or SwcJsMinimizerRspackPlugin to enable Rsdoctor analysis for BannerPlugin.',
                    ),
                  );
                }
              }
              const chunks = compilation.chunks;
              for (let chunk of chunks) {
                for (const file of chunk.files) {
                  if (!file || extname(file) !== '.js') {
                    continue;
                  }

                  const { ConcatSource } = compiler.webpack.sources;

                  compilation.updateAsset(
                    file,
                    // @ts-ignore - webpack/rspack type compatibility issue
                    (old) => {
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
    } finally {
      timeEnd('InternalBundleTagPlugin.apply');
    }
  }
}
