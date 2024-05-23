import { type Compiler } from '@rspack/core';
import { extname } from 'path';
import { ConcatSource } from 'webpack-sources';

export class BundleTagPlugin {
  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap('RsdoctorTagBannerPlugin', (compilation) => {
      compilation.hooks.processAssets.tapPromise(
        {
          name: 'RsdoctorTagBannerPlugin',
          stage: -2000,
        },
        async () => {
          const chunks = compilation.chunks;
          for (let chunk of chunks) {
            for (const file of chunk.files) {
              if (!file || extname(file) !== '.js') {
                continue;
              }

              compilation.updateAsset(
                file,
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
    });
  }
}
