import type { RsdoctorWebpackSDK } from '@rsdoctor/sdk';
import type { Linter, Plugin } from '@rsdoctor/types';
import {
  internalPluginTapPostOptions,
  internalPluginTapPreOptions,
} from '../constants';
import type { InternalPlugin, RsdoctorPluginInstance } from '@/types';

export abstract class InternalBasePlugin<T extends Plugin.BaseCompiler>
  implements InternalPlugin<T, Linter.ExtendRuleData[]>
{
  abstract name: string;

  constructor(
    public readonly scheduler: RsdoctorPluginInstance<
      Plugin.BaseCompiler,
      Linter.ExtendRuleData[]
    >,
  ) {}

  abstract apply(compiler: T): void;

  get options() {
    return this.scheduler.options;
  }

  get sdk(): RsdoctorWebpackSDK {
    return this.scheduler.sdk;
  }

  get tapPostOptions() {
    return internalPluginTapPostOptions(this.name);
  }

  get tapPreOptions() {
    return internalPluginTapPreOptions(this.name);
  }
}
