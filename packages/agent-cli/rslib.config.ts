import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      source: {
        entry: {
          index: './src/index.ts',
        },
        tsconfigPath: './tsconfig.json',
      },
      output: {
        distPath: {
          root: './dist/',
        },
      },
      bundle: true,
      dts: false,
      format: 'esm',
      syntax: 'es2021',
    },
  ],
});
