import { defineConfig } from '@rslib/core';
import { cjsConfig, esmConfig } from '../../scripts/rslib.base.config';

export default defineConfig({
  lib: [esmConfig, cjsConfig],
  source: {
    entry: {
      common: './src/common/index.ts',
      build: './src/build/index.ts',
      error: './src/error/index.ts',
      ruleUtils: './src/rule-utils/index.ts',
      logger: './src/logger.ts',
    },
  },
});
