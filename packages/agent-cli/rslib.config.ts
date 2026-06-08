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
      dts: true,
      format: 'esm',
      redirect: {
        dts: {
          extension: true,
        },
      },
      syntax: 'es2021',
    },
  ],
});
