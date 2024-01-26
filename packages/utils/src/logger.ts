import chalk from 'chalk';
import { logger } from 'rslog';
import { Constants } from '@rsdoctor/types';

/**
 * log debug message
 */
export function debug(getMsg: () => string, prefix = '') {
  if (!process.env[Constants.RsdoctorProcessEnvDebugKey]) {
    return;
  }

  logger.level = 'verbose';
  logger.debug(`${prefix} ${getMsg()}`);
}

export { chalk, logger };
