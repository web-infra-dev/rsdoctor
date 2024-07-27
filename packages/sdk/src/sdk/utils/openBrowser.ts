/**
 * The following is modified based on source found in
 * https://github.com/facebook/create-react-app
 *
 * MIT Licensed
 * Copyright (c) 2015-present, Facebook, Inc.
 * https://github.com/facebook/create-react-app/blob/master/LICENSE
 *
 */
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { logger } from '@rsdoctor/utils/logger';
import open from 'open';
import { join } from 'node:path';

const execAsync = promisify(exec);

const supportedChromiumBrowsers = [
  'Google Chrome Canary',
  'Google Chrome Dev',
  'Google Chrome Beta',
  'Google Chrome',
  'Microsoft Edge',
  'Brave Browser',
  'Vivaldi',
  'Chromium',
];

const getTargetBrowser = async () => {
  // Use user setting first
  let targetBrowser = process.env.BROWSER;
  // If user setting not found or not support, use opening browser first
  if (!targetBrowser || !supportedChromiumBrowsers.includes(targetBrowser)) {
    const { stdout: ps } = await execAsync('ps cax');
    targetBrowser = supportedChromiumBrowsers.find((b) => ps.includes(b));
  }
  return targetBrowser;
};

/**
 * Reads the BROWSER environment variable and decides what to do with it.
 */
export async function openBrowser(url: string): Promise<boolean | undefined> {
  // If we're on OS X, the user hasn't specifically
  // requested a different browser, we can try opening
  // a Chromium browser with AppleScript. This lets us reuse an
  // existing tab when possible instead of creating a new one.
  const shouldTryOpenChromeWithAppleScript =
    process.platform === 'darwin' || process.platform === 'win32';
  if (shouldTryOpenChromeWithAppleScript) {
    try {
      const targetBrowser = await getTargetBrowser();
      if (targetBrowser) {
        // Try to reuse existing tab with AppleScript
        await execAsync(
          `osascript openChrome.applescript "${encodeURI(
            url,
          )}" "${targetBrowser}"`,
          {
            cwd: join(__dirname, '../../../../static'),
          },
        );
        return true;
      }
      logger.debug('Failed to find the target browser.');
    } catch (err) {
      logger.debug('Failed to open Rsdoctor URL with apple script.');
      logger.debug(err);
      return false;
    }
  } else {
    // Fallback to open
    // (It will always open new tab)
    try {
      await open(url);
      return true;
    } catch (err) {
      logger.error('Failed to open Rsdoctor URL.');
      logger.error(err);
      return false;
    }
  }
}
