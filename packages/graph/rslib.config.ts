import { defineConfig } from '@rslib/core';
import {
  cjsConfig,
  esmConfig,
  pluginsConfig,
} from '../../scripts/rslib.base.config';

export default defineConfig({
  lib: [esmConfig, cjsConfig],
  plugins: pluginsConfig,
  source: {
    entry: {
      index: './src/index.ts',
    },
  },
});
