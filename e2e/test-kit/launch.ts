import { chromium } from '@playwright/test';

export async function launchPlaywright() {
  const browser = await chromium.launch();

  const page = await browser.newPage();

  return {
    browser,
    page,
  };
}
