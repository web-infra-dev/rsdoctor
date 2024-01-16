import { RsdoctorRspackPluginOptions } from '@rsdoctor/core/types';
import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin';
import { Linter } from '@rsdoctor/types';
import { File } from '@rsdoctor/utils/build';
import { tmpdir } from 'os';
import path from 'path';

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
      await File.fse.remove(plugin.sdk.outputDir);
    } catch (e) {
      console.error(e);
    }
  });

  return plugin;
}
