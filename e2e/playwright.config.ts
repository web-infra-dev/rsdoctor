import { defineConfig } from '@playwright/test';

const isCI = Boolean(process.env.CI);

export default defineConfig({
  build: {
    external: ['**/packages/*/dist/**', '**/scripts/test-helper/dist/**'],
  },
  testMatch: ['/cases/**/**.test.ts'],
  timeout: 60000,
  use: {
    channel: isCI ? 'chrome' : undefined,
    launchOptions: {
      args: ['--experimental-modules', '--es-module-specifier-resolution=node'],
    },
  },
});
