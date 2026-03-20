import { defineConfig } from '@rslib/core';

export default defineConfig({
  source: {
    entry: {
      index: './src/index.ts',
    },
  },
  lib: [
    {
      format: 'esm',
      syntax: ['node 16'],
      dts: {
        build: false,
      },
      redirect: {
        js: {
          path: true,
          extension: true,
        },
        dts: {
          path: true,
          extension: true,
        },
      },
      output: {
        filename: {
          js: '[name].js',
        },
      },
    },
    {
      format: 'cjs',
      syntax: ['node 16'],
      dts: false,
      output: {
        filename: {
          js: '[name].cjs',
        },
      },
    },
  ],
});
