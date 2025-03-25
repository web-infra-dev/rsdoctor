import type {
  CreateRsbuildOptions,
  RsbuildConfig,
  RsbuildInstance,
  RsbuildPlugin,
  RsbuildPlugins,
} from '@rsbuild/core';
import { isPromise } from 'node:util/types';

export async function createStubRsbuild({
  rsbuildConfig = {},
  plugins,
  ...options
}: CreateRsbuildOptions & {
  rsbuildConfig?: RsbuildConfig;
  plugins?: RsbuildPlugins;
}): Promise<RsbuildInstance> {
  const { createRsbuild } = await import('@rsbuild/core');
  const rsbuildOptions = {
    cwd: process.env.REBUILD_TEST_SUITE_CWD || process.cwd(),
    rsbuildConfig,
    ...options,
  };

  // mock default entry
  if (!rsbuildConfig.source?.entry && !rsbuildConfig.environments) {
    rsbuildConfig.source ||= {};
    rsbuildConfig.source.entry = {
      index: './src/index.js',
    };
  }

  const rsbuild = await createRsbuild(rsbuildOptions);

  const getFlattenedPlugins = async (pluginOptions: RsbuildPlugins) => {
    let plugins = pluginOptions;
    do {
      plugins = (await Promise.all(plugins)).flat(
        Number.POSITIVE_INFINITY as 1,
      );
    } while (plugins.some((v) => isPromise(v)));

    return plugins as Array<RsbuildPlugin | false | null | undefined>;
  };

  if (plugins) {
    // remove all builtin plugins
    rsbuild.removePlugins(rsbuild.getPlugins().map((item) => item.name));
    rsbuild.addPlugins(await getFlattenedPlugins(plugins));
  }

  return {
    ...rsbuild,
  };
}
