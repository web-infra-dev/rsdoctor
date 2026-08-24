import type { Page } from 'playwright';
import { execute } from '@rsdoctor/cli';
import type { SDK } from '@rsdoctor/shared/types';
import { resolve } from 'path';

export * from './path';

export async function waitReload(page: Page) {
  // await page.waitForNetworkIdle();
  await page.waitForSelector('#root', { timeout: 20000 });
}

export async function openBrowserByCLI(
  page: Page,
  manifestFile: string,
  ...args: Parameters<SDK.RsdoctorServerInstance['getClientUrl']>
) {
  const sdk = await execute('analyze', {
    profile: resolve(process.cwd(), manifestFile),
    open: false,
  });

  await page.goto(sdk.server.getClientUrl(...args));

  console.log('waitForNetworkIdle');
  await waitReload(page);

  console.log('page loaded');

  async function dispose() {
    await page.close();
    await sdk?.dispose();
  }

  return {
    sdk,
    page,
    dispose,
  };
}

export async function openBrowserByDiffCLI(
  page: Page,
  manifestFile: string,
  ..._args: Parameters<SDK.RsdoctorServerInstance['getClientUrl']>
) {
  // @ts-ignore
  const sdk = await execute('bundle-diff', {
    baseline: resolve(process.cwd(), manifestFile),
    current: resolve(process.cwd(), manifestFile),
    open: false,
  });

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
    await page.close();
    await sdk?.dispose();
  }

  return {
    sdk,
    page,
    dispose,
  };
}
