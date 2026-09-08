import { RsdoctorRspackPlugin } from '@rsdoctor/core';
import type { RsdoctorRspackPluginOptions } from '@rsdoctor/core';
import { Linter } from '@rsdoctor/shared/types';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
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
    `./${randomUUID()}/rsdoctor_rspack_plugin_test`,
  );

  plugin.sdk.hooks.afterSaveManifest.tapPromise(
    { name: 'REMOVE_TMP_DIR', stage: -9999 },
    async () => {
      plugin.sdk.setOutputDir(outdir);
      try {
        await rm(plugin.sdk.outputDir, { recursive: true, force: true });
      } catch (e) {
        console.error(e);
      }
    },
  );

  return plugin;
}
