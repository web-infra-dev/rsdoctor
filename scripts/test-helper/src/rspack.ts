import {
  rspack,
  type Compiler,
  type Configuration,
  type Stats,
  type StatsValue,
} from '@rspack/core';
import { createFsFromVolume, Volume } from 'memfs';
import path from 'path';

function promisifyCompilerRun<
  T extends Compiler,
  P = ReturnType<Stats['toJson']>,
>(compiler: T, statsOptions?: StatsValue): Promise<P> {
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

      const statsData = stats.toJson(statsOptions);

      if (stats.hasErrors()) {
        reject(statsData.errors);
        return;
      }

      resolve(statsData as P);
    });
  });
}

export function compileByRspack(
  absPath: Configuration['entry'],
  options: Configuration = {},
  statsOptions?: StatsValue,
) {
  const compiler = rspack({
    entry: absPath,
    mode: 'none',
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

  return promisifyCompilerRun(compiler, statsOptions);
}

export function compileByRspackLayers(
  entry: Configuration['entry'],
  options: Configuration = {},
  statsOptions?: StatsValue,
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

  return promisifyCompilerRun(compiler, statsOptions);
}
