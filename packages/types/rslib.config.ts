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
        build: true,
      },
      output: {
        filename: {
          js: '[name].js',
        },
      },
    },
  ],
});
