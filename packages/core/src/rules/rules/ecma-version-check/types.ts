import type { ECMAVersion } from '@rsdoctor/utils/ruleUtils';

export interface Config {
  /** Check the ecma version */
  highestVersion: ECMAVersion;
  /** Js files that need to be ignored */
  ignore: string[];
}
