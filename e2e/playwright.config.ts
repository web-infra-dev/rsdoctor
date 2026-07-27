import { defineConfig } from '@playwright/test';

export default defineConfig({
  build: {
    external: ['**/packages/*/dist/**', '**/scripts/test-helper/dist/**'],
  },
  testMatch: ['/cases/**/**.test.ts'],
  timeout: 60000,
  use: {
    launchOptions: {
      args: ['--experimental-modules', '--es-module-specifier-resolution=node'],
    },
  },
});
