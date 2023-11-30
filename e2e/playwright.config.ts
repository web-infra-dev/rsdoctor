import { defineConfig } from '@playwright/test';

export default defineConfig({
  testMatch: ['/cases/**/**.test.ts'],
});