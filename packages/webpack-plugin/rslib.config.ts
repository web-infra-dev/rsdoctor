import { defineConfig } from '@rslib/core';
import { baseBuildConfig } from '../../scripts/rslib.base.config';

export default defineConfig({
  ...baseBuildConfig,
  ...{
    source: { tsconfigPath: 'tsconfig.build.json' },
  },
});
