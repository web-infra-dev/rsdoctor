import { SDK } from '@rsdoctor/types';
import { execute } from '@rsdoctor/cli';
import { resolve } from 'path';
import { launchPlaywright } from './launch';
import { Page } from '@playwright/test';

export * from './path';

const callbacks: Array<() => unknown> = [];

export async function waitReload(page: Page) {
  // await page.waitForNetworkIdle();
  await page.waitForSelector('#root', { timeout: 20000 });
}

export async function openBrowserByCLI(
  manifestFile: string,
  ...args: Parameters<SDK.RsdoctorServerInstance['getClientUrl']>
) {
  const sdk = await execute('analyze', {
    profile: resolve(process.cwd(), manifestFile),
    open: false,
  });

  console.log('launch puppeteer');

  const { browser, page } = await launchPlaywright();

  await page.goto(sdk.server.getClientUrl(...args));

  console.log('waitForNetworkIdle');
  await waitReload(page);

  console.log('page loaded');

  async function dispose() {
    const i = callbacks.findIndex((e) => e === dispose);
    i > -1 && callbacks.splice(i, 1);
    await Promise.all([sdk?.dispose(), browser?.close()]);
  }

  callbacks.push(dispose);

  return {
    sdk,
    browser,
    page,
    dispose,
  };
}

export async function openBrowserByDiffCLI(
  manifestFile: string,
  ..._args: Parameters<SDK.RsdoctorServerInstance['getClientUrl']>
) {
  // @ts-ignore
  const sdk = await execute('bundle-diff', {
    baseline: resolve(process.cwd(), manifestFile),
    current: resolve(process.cwd(), manifestFile),
    open: false,
  });

  console.log('launch puppeteer');

  const { browser, page } = await launchPlaywright();
  const { origin } = sdk.server;

  await page.goto(
    `${origin}/index.html?__bundle_files__=${origin}%2Fapi%2Fbundle_diff%2Fmanifest.json%2C${origin}%2Fapi%2Fbundle_diff%2Fmanifest.json#/resources/bundle/diff`,
  );
  console.log(
    'page loaded',
    `${origin}/index.html?__bundle_files__=${origin}%2Fapi%2Fbundle_diff%2Fmanifest.json%2C${origin}%2Fapi%2Fbundle_diff%2Fmanifest.json#/resources/bundle/diff`,
  );

  console.log('waitForNetworkIdle');
  await waitReload(page);

  console.log('page loaded');

  async function dispose() {
    const i = callbacks.findIndex((e) => e === dispose);
    i > -1 && callbacks.splice(i, 1);
    await Promise.all([sdk?.dispose(), browser?.close()]);
  }

  callbacks.push(dispose);

  return {
    sdk,
    browser,
    page,
    dispose,
  };
}
