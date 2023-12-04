import { DoctorSDKController } from '@rsdoctor/sdk';
import { Linter } from '@rsdoctor/types';
import type { DoctorWebpackMultiplePluginOptions } from '@rsdoctor/core';

import { RsdoctorWebpackPlugin } from './plugin';

let globalController: DoctorSDKController | undefined;

export class RsdoctorWebpackMultiplePlugin<
  Rules extends Linter.ExtendRuleData[],
> extends RsdoctorWebpackPlugin<Rules> {
  // @ts-expect-error
  private controller: DoctorSDKController;

  constructor(options: DoctorWebpackMultiplePluginOptions<Rules> = {}) {
    const controller = (() => {
      if (globalController) {
        return globalController;
      }
      const controller = new DoctorSDKController();
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
