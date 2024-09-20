import { webkit } from '@playwright/test';

export async function launchPlaywright() {
  const browser = await webkit.launch();

  const page = await browser.newPage();

  return {
    browser,
    page,
  };
}
