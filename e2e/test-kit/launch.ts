import { webkit } from '@playwright/test';

export async function launchPlaywright() {
  const browser = await webkit.launch({
    headless: true,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();

  return {
    browser,
    page,
  };
}
