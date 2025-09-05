import { RsdoctorPrimarySDK, RsdoctorSDKController } from '@rsdoctor/sdk';
import { SDK, type Linter } from '@rsdoctor/types';
import type { RsdoctorMultiplePluginOptions } from '@rsdoctor/core/types';

import { RsdoctorWebpackPlugin } from './plugin';
import { normalizeUserConfig } from '@rsdoctor/core/plugins';
import type { Compiler } from 'webpack';

let globalController: RsdoctorSDKController | undefined;

export class RsdoctorWebpackMultiplePlugin<
  Rules extends Linter.ExtendRuleData[],
> extends RsdoctorWebpackPlugin<Rules> {
  // @ts-expect-error
  private controller: RsdoctorSDKController;

  constructor(options: RsdoctorMultiplePluginOptions<Rules> = {}) {
    const controller = (() => {
      if (globalController) {
        return globalController;
      }
      const controller = new RsdoctorSDKController();
      globalController = controller;
      return controller;
    })();

    const normallizedOptions = normalizeUserConfig<Rules>(options);

    const instance = controller.createSlave({
      name: options.name || 'Builder',
      stage: options.stage,
      extraConfig: {
        innerClientPath: normallizedOptions.innerClientPath,
        printLog: normallizedOptions.printLog,
        mode: normallizedOptions.output.mode
          ? normallizedOptions.output.mode
          : undefined,
        brief:
          normallizedOptions.output.mode === SDK.IMode[SDK.IMode.brief]
            ? normallizedOptions.output.options || undefined
            : undefined,
      },
      type: normallizedOptions.output.reportCodeType,
    });

    super({
      ...options,
      sdkInstance: instance,
    });

    this.controller = controller;
  }

  apply(compiler: Compiler) {
    if ('dependencies' in compiler.options) {
      (this.sdk as RsdoctorPrimarySDK).dependencies =
        compiler.options.dependencies;
    }

    super.apply(compiler);
  }
}
