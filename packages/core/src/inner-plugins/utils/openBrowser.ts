import { exec } from 'node:child_process';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { logger } from '@rsdoctor/core/logger';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));

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
  let targetBrowser = process.env.BROWSER;
  if (!targetBrowser || !supportedChromiumBrowsers.includes(targetBrowser)) {
    const { stdout: ps } = await execAsync('ps cax');
    targetBrowser = supportedChromiumBrowsers.find((b) => ps.includes(b));
  }
  return targetBrowser;
};

export async function openBrowser(
  url: string,
  needEncodeURI = true,
): Promise<boolean | undefined> {
  const shouldTryOpenChromeWithAppleScript =
    process.platform === 'darwin' || process.platform === 'win32';
  if (shouldTryOpenChromeWithAppleScript) {
    try {
      const targetBrowser = await getTargetBrowser();
      if (targetBrowser) {
        await execAsync(
          `osascript openChrome.applescript "${
            needEncodeURI ? encodeURI(url) : url
          }" "${targetBrowser}"`,
          {
            cwd: join(__dirname, '../../../static'),
          },
        );
        return true;
      }
      logger.debug('Failed to find the target browser.');
      const { default: open } = await import('open');
      await open(url);
      return true;
    } catch (err) {
      logger.debug('Failed to open Rsdoctor URL with apple script.');
      logger.debug(err);
    }
  } else {
    try {
      const { default: open } = await import('open');
      await open(url);
      return true;
    } catch (err) {
      logger.error('Failed to open Rsdoctor URL.');
      logger.error(err);
      return false;
    }
  }
}
