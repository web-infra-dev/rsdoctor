import path from 'node:path';
import { defineConfig } from '@rstest/core';
import rootConfig from '../../rstest.config';

export default defineConfig({
  extends: rootConfig,
  root: path.resolve(__dirname, '../..'),
  include: ['packages/core/**/*.test.ts'],
});
