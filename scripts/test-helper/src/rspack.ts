import { Compiler, Configuration, rspack, Stats } from '@rspack/core';
import { createFsFromVolume, Volume } from 'memfs';
import path from 'path';

function promisifyCompilerRun<
  T extends Compiler,
  P = ReturnType<Stats['toJson']>,
>(compiler: T): Promise<P> {
  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        // @ts-ignore
        reject(err);
      }

      if (!stats) {
        reject(
          'The Stats file is empty, please check the build configuration.',
        );
        return;
      }

      if (stats.hasErrors()) {
        reject(stats.toJson().errors);
      }

      resolve(stats.toJson() as P);
    });
  });
}

export function compileByRspack(
  absPath: Configuration['entry'],
  options: Configuration = {},
) {
  const compiler = rspack({
    entry: absPath,
    mode: 'none',
    output: {
      path: path.resolve(__dirname),
      filename: 'bundle.js',
    },
    stats: 'normal',
    cache: false,
    ...options,
    optimization: {
      minimize: false,
      // concatenateModules: true,
      ...options.optimization,
    },
  });

  // @ts-ignore
  compiler.outputFileSystem = createFsFromVolume(new Volume());

  return promisifyCompilerRun(compiler);
}

export function compileByRspackLayers(
  entry: Configuration['entry'],
  options: Configuration = {},
) {
  const compiler = rspack({
    entry,
    mode: 'none',
    output: {
      path: path.resolve(__dirname),
      // filename: 'bundle.js',
    },
    stats: 'normal',
    cache: false,
    ...options,
    optimization: {
      minimize: false,
      // concatenateModules: true,
      ...options.optimization,
    },
  });

  // @ts-ignore
  compiler.outputFileSystem = createFsFromVolume(new Volume());

  return promisifyCompilerRun(compiler);
}
