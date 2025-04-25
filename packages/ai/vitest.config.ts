import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Configure Vitest (https://vitest.dev/config/)
  test: {
    testTimeout: 500000,
    setupFiles: ['dotenv/config'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
