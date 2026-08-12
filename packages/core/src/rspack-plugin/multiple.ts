import type { Linter } from '@rsdoctor/shared/types';
import type { RsdoctorMultiplePluginOptions } from '../types';
import { RsdoctorRspackPlugin } from './plugin';

/**
 * @deprecated Use {@link RsdoctorRspackPlugin}. Multi-compiler builds are now
 * detected and isolated automatically.
 */
export class RsdoctorRspackMultiplePlugin<
  Rules extends Linter.ExtendRuleData[],
> extends RsdoctorRspackPlugin<Rules> {
  constructor(options: RsdoctorMultiplePluginOptions<Rules> = {}) {
    super(options);
  }
}
