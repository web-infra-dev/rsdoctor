import { RuleMessage } from './type';

import * as E1001 from './E1001';
import * as E1002 from './E1002';
import * as E1003 from './E1003';
import * as E1004 from './E1004';
import * as E1005 from './E1005';
import * as E1006 from './E1006';
import * as E1007 from './E1007';
import * as E1008 from './E1008';
import * as E1009 from './E1009';

export type RuleErrorCodes = {
  [E1001.code]: typeof E1001;
  [E1002.code]: typeof E1002;
  [E1003.code]: typeof E1003;
  [E1004.code]: typeof E1004;
  [E1005.code]: typeof E1005;
  [E1006.code]: typeof E1006;
  [E1007.code]: typeof E1007;
  [E1008.code]: typeof E1008;
  [E1009.code]: typeof E1009;
};

/**
 * The format is E + "4 digits".
 * - The first number represents the category:
 * - 1 for Webpack build related indexes
 * - ...
 * - The rest of the numbers can be increased by adding zeros
 */
export const RuleErrorMap: Record<keyof RuleErrorCodes, RuleMessage> = {
  [E1001.code]: E1001.message,
  [E1002.code]: E1002.message,
  [E1003.code]: E1003.message,
  [E1004.code]: E1004.message,
  [E1005.code]: E1005.message,
  [E1006.code]: E1006.message,
  [E1007.code]: E1007.message,
  [E1008.code]: E1008.message,
  [E1009.code]: E1009.message,
};

export enum RsdoctorRuleClientConstant {
  UrlQueryForErrorCode = 'code',
}

export * from './type';
