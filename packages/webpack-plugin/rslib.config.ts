import { defineConfig } from '@rslib/core';
import { dualPackage } from '../../scripts/rslib.base.config';

export default defineConfig({
  ...dualPackage,
  ...{
    source: { tsconfigPath: 'tsconfig.build.json' },
  },
});
