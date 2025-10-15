import { defineConfig } from '@rslib/core';
import { dualPackage } from '../../scripts/rslib.base.config';

export default defineConfig({
  ...dualPackage,
  lib: dualPackage.lib?.map((config) => ({
    ...config,
    output: {
      ...config.output,
      externals: [
        'readable-stream',
        ...(Array.isArray(config.output?.externals)
          ? config.output.externals
          : []),
      ],
    },
  })),
});
