import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testMatch: ['/cases/**/**.test.ts'],
  name: 'chrome',
  use: {
    ...devices.DesktopChrome,
  },
});
