import { RsdoctorSDKController } from '@rsdoctor/sdk';
import type { Linter } from '@rsdoctor/types';
import type { RsdoctorWebpackMultiplePluginOptions } from '@rsdoctor/core';

import { RsdoctorWebpackPlugin } from './plugin';

let globalController: RsdoctorSDKController | undefined;

export class RsdoctorWebpackMultiplePlugin<
  Rules extends Linter.ExtendRuleData[],
> extends RsdoctorWebpackPlugin<Rules> {
  // @ts-expect-error
  private controller: RsdoctorSDKController;

  constructor(options: RsdoctorWebpackMultiplePluginOptions<Rules> = {}) {
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
