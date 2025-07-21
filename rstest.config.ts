import { defineConfig } from '@rstest/core';

// Disable color in test
process.env.NO_COLOR = '1';

export default defineConfig({
  name: 'node',
  globals: true,
  restoreMocks: true,
  source: {
    decorators: {
      version: 'legacy'
    },
    tsconfigPath: 'packages/core/tsconfig.json',
  },
  include: ['packages/**/*.test.ts'],
  exclude: ['**/node_modules/**', 'packages/ai/**/*.test.ts'],
  setupFiles: ['./scripts/rstest.setup.ts'],
});
