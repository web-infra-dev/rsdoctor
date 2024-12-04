import { RsdoctorSDKController } from '@rsdoctor/sdk';
import type { Linter } from '@rsdoctor/types';
import type { RsdoctorMultiplePluginOptions } from '@rsdoctor/core';

import { RsdoctorRspackPlugin } from './plugin';
import { normalizeUserConfig } from '@rsdoctor/core/plugins';

let globalController: RsdoctorSDKController | undefined;

export class RsdoctorRspackMultiplePlugin<
  Rules extends Linter.ExtendRuleData[],
> extends RsdoctorRspackPlugin<Rules> {
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
        disableTOSUpload: normallizedOptions.disableTOSUpload || false,
        innerClientPath: normallizedOptions.innerClientPath,
        printLog: normallizedOptions.printLog,
        mode: normallizedOptions.mode ? normallizedOptions.mode : undefined,
        brief: normallizedOptions.brief,
      },
      type: normallizedOptions.reportCodeType,
    });

    super({
      ...options,
      sdkInstance: instance,
    });
    this.controller = controller;
  }
}
