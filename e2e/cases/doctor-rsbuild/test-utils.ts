import {
  RsdoctorRspackMultiplePlugin,
  RsdoctorRspackPlugin,
} from '@rsdoctor/rspack-plugin';
import type {
  RsdoctorMultiplePluginOptions,
  RsdoctorRspackPluginOptions,
} from '@rsdoctor/core/types';
import { Linter } from '@rsdoctor/types';
import { File } from '@rsdoctor/core/build-utils';
import { tmpdir } from 'os';
import path from 'path';

export function createRsdoctorPlugin<T extends Linter.ExtendRuleData[]>(
  options: RsdoctorRspackPluginOptions<T> = {},
) {
  const plugin = new RsdoctorRspackPlugin({
    ...options,
    disableClientServer:
      typeof options.disableClientServer === 'boolean'
        ? options.disableClientServer
        : true,
  });

  const outdir = path.resolve(
    tmpdir(),
    `./${Date.now()}/rsdoctor_rspack_plugin_test`,
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
  options: RsdoctorMultiplePluginOptions<T> = {},
) {
  const plugin = new RsdoctorRspackMultiplePlugin({
    ...options,
    disableClientServer:
      typeof options.disableClientServer === 'boolean'
        ? options.disableClientServer
        : true,
  });

  const outdir = path.resolve(
    tmpdir(),
    `./${Date.now()}/rsdoctor_rspack_plugin_test`,
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
