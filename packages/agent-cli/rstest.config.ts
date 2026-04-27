import path from 'node:path';
import { defineConfig } from '@rstest/core';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
