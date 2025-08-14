import { defineConfig } from '@rslib/core';
import { esmConfig } from '../../scripts/rslib.base.config';

export default defineConfig({
  lib: [esmConfig],
  source: {
    entry: {
      index: './src/index.ts',
    },
  },
});
