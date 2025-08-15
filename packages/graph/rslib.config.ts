import { defineConfig } from '@rslib/core';
import { cjsConfig, esmConfig } from '../../scripts/rslib.base.config';

export default defineConfig({
  lib: [esmConfig, cjsConfig],
  source: {
    entry: {
      index: './src/index.ts',
    },
  },
});
