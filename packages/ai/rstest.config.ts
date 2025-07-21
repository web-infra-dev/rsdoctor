import path from 'node:path';
import { defineConfig } from '@rstest/core';

export default defineConfig({
  testTimeout: 500000,
  setupFiles: ['dotenv/config'],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
