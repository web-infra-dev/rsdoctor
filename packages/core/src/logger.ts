import c from 'picocolors';
import { createLogger, logger } from 'rslog';
import { Constants } from '@rsdoctor/types';

/**
 * log debug message
 */
export function debug(getMsg: () => string, prefix = '') {
  if (!process.env.DEBUG) {
    return;
  }

  logger.level = 'verbose';
  logger.debug(`${prefix} ${getMsg()}`);
}

const rsdoctorLogger = createLogger();

rsdoctorLogger.override({
  log: (message) => {
    console.log(`${c.green('[RSDOCTOR LOG]')} ${message}`);
  },
  info: (message) => {
    console.log(`${c.yellow('[RSDOCTOR INFO]')} ${message}`);
  },
  warn: (message) => {
    console.warn(`${c.yellow('[RSDOCTOR WARN]')} ${message}`);
  },
  start: (message) => {
    console.log(`${c.green('[RSDOCTOR START]')} ${message}`);
  },
  ready: (message) => {
    console.log(`${c.green('[RSDOCTOR READY]')} ${message}`);
  },
  error: (message) => {
    console.error(`${c.red('[RSDOCTOR ERROR]')} ${message}`);
  },
  success: (message) => {
    console.error(`${c.green('[RSDOCTOR SUCCESS]')} ${message}`);
  },
  debug: (message) => {
    if (process.env.DEBUG) {
      console.log(`${c.blue('[RSDOCTOR DEBUG]')} ${message}`);
    }
  },
});

// Add timing functionality
const _timers = new Map<string, number>();

function time(label: string) {
  // Early return if debug is not enabled
  if (process.env.DEBUG !== Constants.RsdoctorProcessEnvDebugKey) {
    return;
  }

  if (_timers.has(label)) {
    return;
  }

  _timers.set(label, Date.now());
}

function timeEnd(label: string) {
  // Early return if debug is not enabled
  if (process.env.DEBUG !== Constants.RsdoctorProcessEnvDebugKey) {
    return;
  }

  const start = _timers.get(label);
  if (start == null) {
    logger.debug(`Timer '${label}' does not exist.`);
    return;
  }

  const duration = Date.now() - start;
  logger.debug(`Timer '${label}' ended: ${duration}ms`);
  _timers.delete(label);
}

export { time, timeEnd, c as chalk, rsdoctorLogger as logger };
