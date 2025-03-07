import { RsdoctorWebpackPluginOptions } from '@rsdoctor/core/types';
import {
  RsdoctorWebpackPlugin,
  RsdoctorWebpackMultiplePlugin,
} from '@rsdoctor/webpack-plugin';
import { Linter } from '@rsdoctor/types';
import { File } from '@rsdoctor/utils/build';
import { tmpdir } from 'os';
import path from 'path';

export function createRsdoctorPlugin<T extends Linter.ExtendRuleData[]>(
  options: RsdoctorWebpackPluginOptions<T> = {},
) {
  const plugin = new RsdoctorWebpackPlugin({
    ...options,
    disableClientServer:
      typeof options.disableClientServer === 'boolean'
        ? options.disableClientServer
        : true,
  });

  const outdir = path.resolve(
    tmpdir(),
    `./${Date.now()}/rsdoctor_webpack_plugin_test`,
  );

  plugin.sdk.hooks.afterSaveManifest.tapPromise(
    { name: 'REMOVE_TMP_DIR', stage: -9999 },
    async () => {
      plugin.sdk.setOutputDir(outdir);
      try {
        await File.fse.remove(plugin.sdk.outputDir);
      } catch (e) {
        console.error(e);
      }
    },
  );

  return plugin;
}

export function createRsdoctorMultiPlugin<T extends Linter.ExtendRuleData[]>(
  options: RsdoctorWebpackPluginOptions<T> = {},
) {
  const plugin = new RsdoctorWebpackMultiplePlugin({
    ...options,
    disableClientServer:
      typeof options.disableClientServer === 'boolean'
        ? options.disableClientServer
        : true,
  });

  const outdir = path.resolve(
    tmpdir(),
    `./${Date.now()}/rsdoctor_webpack_plugin_test`,
  );

  plugin.sdk.hooks.afterSaveManifest.tapPromise(
    { name: 'REMOVE_TMP_DIR', stage: -9999 },
    async () => {
      plugin.sdk.setOutputDir(outdir);
      try {
        await File.fse.remove(plugin.sdk.outputDir);
      } catch (e) {
        console.error(e);
      }
    },
  );

  return plugin;
}
