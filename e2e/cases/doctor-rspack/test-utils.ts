import type { RsdoctorRspackPluginOptions } from '@rsdoctor/core';
import { RsdoctorRspackPlugin } from '@rsdoctor/core';
import { Linter } from '@rsdoctor/shared/types';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import events from 'node:events';

const emitter = new events.EventEmitter();
emitter.setMaxListeners(50);
events.EventEmitter.defaultMaxListeners = 50;

export function createRsdoctorPlugin<T extends Linter.ExtendRuleData[]>(
  options: RsdoctorRspackPluginOptions<T>,
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
    `./${Date.now()}/rsbuild_doctor_rspack_plugin_test`,
  );

  plugin.sdk.hooks.afterSaveManifest.tapPromise('REMOVE_TMP_DIR', async () => {
    plugin.sdk.setOutputDir(outdir);
    try {
      await rm(plugin.sdk.outputDir, { recursive: true, force: true });
    } catch (e) {
      console.error(e);
    }
  });

  return plugin;
}
