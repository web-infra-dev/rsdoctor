import path from 'node:path';
import type { RstestConfig } from 'rstack/test';

// Disable color in tests.
process.env.NO_COLOR = '1';

export const baseConfig: RstestConfig = {
  name: 'node',
  globals: true,
  restoreMocks: true,
  pool: {
    // Build-heavy tests are flaky under parallel workers in this repo.
    maxWorkers: 1,
  },
  source: {
    decorators: {
      version: 'legacy',
    },
    tsconfigPath: path.join(import.meta.dirname, 'tsconfig-test.json'),
  },
  exclude: ['**/node_modules/**'],
  setupFiles: [path.join(import.meta.dirname, 'rstest.setup.ts')],
};
