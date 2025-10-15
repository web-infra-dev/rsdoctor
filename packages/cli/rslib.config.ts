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
        'graceful-fs',
        'fs-extra',
        '@rsdoctor/client',
        'safer-buffer',
        'socket.io',
        ...(Array.isArray(config.output?.externals)
          ? config.output.externals
          : []),
      ],
    },
    shims: {
      esm: {
        __filename: true,
        __dirname: true,
      },
    },
  })),
});
