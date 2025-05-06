import c from 'picocolors';
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

export { c as chalk, logger };

logger.override({
  log: (message) => {
    console.log(`[Rsdoctor log] ${message}`);
  },
  info: (message) => {
    console.log(`[Rsdoctor info] ${message}`);
  },
  warn: (message) => {
    console.warn(`[Rsdoctor warn] ${message}`);
  },
  start: (message) => {
    console.log(`[Rsdoctor start] ${message}`);
  },
  ready: (message) => {
    console.log(`[Rsdoctor ready] ${message}`);
  },
  error: (message) => {
    console.error(`[Rsdoctor error] ${message}`);
  },
  success: (message) => {
    console.error(`[Rsdoctor success] ${message}`);
  },
  debug: (message) => {
    if (process.env.DEBUG) {
      console.log(`[Rsdoctor debug] ${message}`);
    }
  },
});
