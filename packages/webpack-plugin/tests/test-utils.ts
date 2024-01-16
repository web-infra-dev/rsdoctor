import { RsdoctorWebpackPluginOptions } from '@rsdoctor/core/types';
import { Linter } from '@rsdoctor/types';
import { File } from '@rsdoctor/utils/build';
import { tmpdir } from 'os';
import path from 'path';
import { RsdoctorWebpackPlugin } from '../src';

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
    `./${Date.now()}/web_doctor_webpack_plugin_test`,
  );
  plugin.sdk.setOutputDir(outdir);

  plugin.sdk.hooks.afterSaveManifest.tapPromise('REMOVE_TMP_DIR', async () => {
    await File.fse.remove(plugin.sdk.outputDir);
  });

  return plugin;
}
