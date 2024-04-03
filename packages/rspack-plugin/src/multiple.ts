import { RsdoctorSDKController } from '@rsdoctor/sdk';
import type { Linter } from '@rsdoctor/types';
import type { RsdoctorMultiplePluginOptions } from '@rsdoctor/core';

import { RsdoctorRspackPlugin } from './plugin';

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

    const instance = controller.createSlave({
      name: options.name || 'Builder',
      stage: options.stage,
      extraConfig: { disableTOSUpload: options.disableTOSUpload || false },
    });

    super({
      ...options,
      sdkInstance: instance,
    });

    this.controller = controller;
  }
}
