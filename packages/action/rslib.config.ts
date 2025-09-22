import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      bundle: true,
      dts: false,
      format: 'cjs',
    },
  ],
});
