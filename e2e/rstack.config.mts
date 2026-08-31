import { define } from 'rstack';

define.test({
  name: 'e2e',
  include: ['cases/**/*.test.ts'],
  exclude: ['**/node_modules/**', '**/dist/**'],
  testEnvironment: 'node',
  env: {
    RSTEST: undefined,
  },
  testTimeout: 60_000,
  hookTimeout: 60_000,
  pool: {
    maxWorkers: '50%',
  },
});
