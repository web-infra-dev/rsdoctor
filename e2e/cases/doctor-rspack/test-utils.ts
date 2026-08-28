import type { RsdoctorRspackPluginOptions } from '@rsdoctor/core';
import { RsdoctorRspackPlugin } from '@rsdoctor/core';
import type { Linter, SDK } from '@rsdoctor/shared/types';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'os';
import path from 'path';

type SDKWithChildren = SDK.RsdoctorBuilderSDKInstance & {
  parent: {
    slaves: Array<
      SDK.RsdoctorBuilderSDKInstance & {
        compilerPath: string;
      }
    >;
  };
};

export function getChildSDK(
  sdk: SDK.RsdoctorBuilderSDKInstance,
  compilerPath?: string,
) {
  if (!compilerPath || !('parent' in sdk)) {
    return undefined;
  }

  return (sdk as SDKWithChildren).parent.slaves.find(
    (item) => item.compilerPath === compilerPath,
  );
}

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
    `./${randomUUID()}/rsbuild_doctor_rspack_plugin_test`,
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
